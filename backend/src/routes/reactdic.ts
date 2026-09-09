import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { matchSmartsBatch } from "../services/rdkit";
import { getLocale, localizeEnum, localizeField } from "../../lib/i18n";

const router = Router();

// 1. Keyword Search
router.get("/search/keyword", async (req, res) => {
  try {
    const { term } = req.query;
    const locale = getLocale(req.query.lang);

    // We fetch all APPROVED reactions by default if no term is provided
    const whereClause = term
      ? {
          status: "APPROVED" as const,
          OR: [
            { name: { contains: String(term), mode: "insensitive" as const } },
            {
              translations: {
                path: ["en", "name"],
                string_contains: String(term),
              },
            },
            {
              tags: {
                some: {
                  OR: [
                    {
                      name: { contains: String(term), mode: "insensitive" as const },
                    },
                    {
                      translations: {
                        path: ["en", "name"],
                        string_contains: String(term),
                      },
                    },
                  ],
                },
              },
            },
            {
              sections: {
                some: {
                  descriptions: {
                    some: {
                      OR: [
                        {
                          description: {
                            contains: String(term),
                            mode: "insensitive" as const,
                          },
                        },
                        {
                          translations: {
                            path: ["en", "description"],
                            string_contains: String(term),
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          ],
        }
      : {
          status: "APPROVED" as const,
        };

    const reactions = await prisma.reaction.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        translations: true,
        tags: {
          select: {
            name: true,
            translations: true,
          },
        },
        status: true,
        sections: {
          select: {
            reactions: { select: { value: true } },
            descriptions: {
              select: {
                description: true,
                translations: true,
              },
            },
          },
        },
      },
      take: 50, // Limit results for performance
    });

    const formattedData = reactions.map((reaction: any) => ({
      id: reaction.id,
      name: localizeField(reaction, "name", locale),
      structureData: reaction.sections?.[0]?.reactions?.[0]?.value || null,
      tags: reaction.tags.map((t: any) =>
        localizeField(t, "name", locale),
      ),
      description:
        reaction.sections
          ?.flatMap((s: any) =>
            s.descriptions?.map((d: any) =>
              localizeField(d, "description", locale),
            ),
          )
          .filter(Boolean)
          .join("; ") || "",
    }));

    res.json({ success: true, data: formattedData });
  } catch (error) {
    console.error("Error in keyword search:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 2. 结构搜索
// 二部完美匹配（Kuhn 增广路）：判断 roleSmartsList 中每个「非空反应物」能否被
// 一个「不同的」用户分子命中。用于「组合匹配」判定。
// 调用方需保证 roleSmartsList.length === 用户分子数，才会形成真正的完美匹配。
// isMatch(smarts, molIdx) = 该 smarts 是否为第 molIdx 个用户分子的子结构。
function coversAllRoles(
  roleSmartsList: string[],
  molCount: number,
  isMatch: (smarts: string, molIdx: number) => boolean,
): boolean {
  if (roleSmartsList.length === 0) return false; // 无反应物角色，不构成组合
  if (roleSmartsList.length > molCount) return false; // 分子数不足以覆盖

  const molToRole: number[] = new Array(molCount).fill(-1); // 分子 -> 已分配的角色下标

  const tryAssign = (roleIdx: number, seen: boolean[]): boolean => {
    const smarts = roleSmartsList[roleIdx]!;
    for (let m = 0; m < molCount; m++) {
      if (seen[m] || !isMatch(smarts, m)) continue;
      seen[m] = true;
      const assigned = molToRole[m]!;
      if (assigned === -1 || tryAssign(assigned, seen)) {
        molToRole[m] = roleIdx;
        return true;
      }
    }
    return false;
  };

  let matched = 0;
  for (let r = 0; r < roleSmartsList.length; r++) {
    if (tryAssign(r, new Array(molCount).fill(false))) matched++;
  }
  return matched === roleSmartsList.length;
}

// 2. Structure Search（支持多分子：组合 / AND / OR 三层匹配）
router.post("/search/structure", async (req, res) => {
  try {
    const { molBlocks } = req.body as { molBlocks?: string[] };
    const locale = getLocale(req.query.lang);

    if (!Array.isArray(molBlocks) || molBlocks.length === 0) {
      return res
        .status(400)
        .json({ error: "No structure provided for search." });
    }

    // Step 1: 取所有 APPROVED 反应及其 patterns→molecules
    const reactions = await prisma.reaction.findMany({
      where: { status: "APPROVED" as const },
      select: {
        id: true,
        name: true,
        translations: true,
        status: true,
        tags: {
          select: {
            name: true,
            translations: true,
          },
        },
        patterns: {
          select: {
            id: true,
            molecules: { select: { smarts: true, role: true } },
          },
        },
        sections: {
          select: {
            reactions: { select: { value: true } },
            descriptions: {
              select: {
                description: true,
                translations: true,
              },
            },
          },
        },
      },
    });

    // Step 2: 收集去重的 smarts，一次批量匹配得布尔矩阵
    const uniqueSmarts = Array.from(
      new Set(
        reactions.flatMap((r) =>
          r.patterns.flatMap((p) =>
            p.molecules
              .filter((m) => m.role === "反应物" && m.smarts)
              .map((m) => m.smarts),
          ),
        ),
      ),
    );

    let lookup: (smarts: string, molIdx: number) => boolean = () => false;
    if (uniqueSmarts.length > 0) {
      const matrix = await matchSmartsBatch(uniqueSmarts, molBlocks); // [smartsIdx][molIdx]
      const smartsIndex = new Map(uniqueSmarts.map((s, i) => [s, i]));
      lookup = (smarts, molIdx) => {
        const si = smartsIndex.get(smarts);
        return si === undefined ? false : !!matrix[si]?.[molIdx];
      };
    }

    const molCount = molBlocks.length;
    const REACTANT_ROLES = new Set(["反应物"]);

    type Tier = "combination" | "and" | "or";
    const tierRank: Record<Tier, number> = { combination: 3, and: 2, or: 1 };

    // Step 3: 逐反应计算层级
    const hits: Array<{ reaction: (typeof reactions)[number]; tier: Tier }> = [];

    for (const reaction of reactions) {
      // 结构搜索只面向“反应物”：只有真正进入产物骨架的底物才参与结构匹配，
      // 反应试剂/催化剂不作为搜索条件。
      const allReactantSmarts = reaction.patterns.flatMap((p) =>
        p.molecules
          .filter((m) => REACTANT_ROLES.has(m.role) && m.smarts)
          .map((m) => m.smarts),
      );
      if (allReactantSmarts.length === 0) continue;

      // 每个用户分子是否命中该反应里的任一反应物
      const molMatched = molBlocks.map((_, m) =>
        allReactantSmarts.some((s) => lookup(s, m)),
      );
      const or = molMatched.some(Boolean);
      if (!or) continue; // 完全不相关

      const and = molMatched.every(Boolean);

      // combination: 存在某 pattern，其「非空反应物」与用户分子数量相等，
      // 并且每个反应物都能被一个不同的用户分子命中（真正的完美匹配）。
      const combination = reaction.patterns.some((p) => {
        const roleSmarts = p.molecules
          .filter((m) => REACTANT_ROLES.has(m.role) && m.smarts)
          .map((m) => m.smarts);
        return (
          roleSmarts.length === molCount &&
          coversAllRoles(roleSmarts, molCount, lookup)
        );
      });

      const tier: Tier = combination ? "combination" : and ? "and" : "or";
      hits.push({ reaction, tier });
    }

    // Step 4: 按层级排序并映射输出
    hits.sort((a, b) => tierRank[b.tier] - tierRank[a.tier]);

    const formattedData = hits.map(({ reaction, tier }) => ({
      id: reaction.id,
      name: localizeField(reaction, "name", locale),
      tags: reaction.tags.map((t: any) => localizeField(t, "name", locale)),
      status: reaction.status,
      matchTier: tier,
      structureData: reaction.sections?.[0]?.reactions?.[0]?.value || null,
      description:
        reaction.sections
          ?.flatMap((s: any) =>
            s.descriptions?.map((d: any) =>
              localizeField(d, "description", locale),
            ),
          )
          .filter(Boolean)
          .join("; ") || "",
    }));

    res.json({ success: true, data: formattedData });
  } catch (error) {
    console.error("Error in structure search:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 3. Get Specific Reaction Detail
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const locale = getLocale(req.query.lang);

    const reaction = await prisma.reaction.findUnique({
      where: { id },
      include: {
        author: {
          select: { name: true },
        },
        tags: true,
        patterns: {
          include: {
            molecules: true,
          },
        },
        sections: {
          include: {
            descriptions: true,
            reactions: true,
          },
        },
      },
    });

    if (!reaction) {
      return res.status(404).json({ error: "Reaction not found." });
    }

    // 返回前按语言本地化：中文原文是 fallback，英文翻译来自 translations JSON；
    // 有限枚举值（mechanismType/form/sectionType/role）通过字典映射。
    const formattedReaction = {
      ...reaction,
      name: localizeField(reaction, "name", locale),
      mechanismType: localizeEnum(reaction.mechanismType, locale) ?? reaction.mechanismType,
      form: localizeEnum(reaction.form, locale) ?? reaction.form,
      tags: reaction.tags
        ? reaction.tags.map((t: any) => localizeField(t, "name", locale))
        : [],
      patterns: reaction.patterns?.map((pattern: any) => ({
        ...pattern,
        name: localizeField(pattern, "name", locale),
        molecules: pattern.molecules?.map((m: any) => ({
          ...m,
          name: localizeField(m, "name", locale),
          // role 是内部逻辑使用的稳定枚举值（反应物/反应试剂/产物），不能翻译
        })) || [],
      })) || [],
      sections: reaction.sections?.map((section: any) => {
        const CONDITION_FIELDS = [
          "temperature",
          "pressure",
          "duration",
          "concentration",
          "solvent",
          "microwave",
          "acidityBasicity",
          "hydro",
        ] as const;
        const localizedSection: any = { ...section };
        for (const field of CONDITION_FIELDS) {
          if (typeof section[field] === "string") {
            localizedSection[field] =
              localizeEnum(section[field], locale) ?? section[field];
          }
        }
        return {
          ...localizedSection,
          sectionType:
            localizeEnum(section.sectionType, locale) ?? section.sectionType,
          descriptions: section.descriptions?.map((d: any) => ({
            ...d,
            description: localizeField(d, "description", locale),
          })) || [],
        };
      }) || [],
    };

    res.json({ success: true, data: formattedReaction });
  } catch (error) {
    console.error("Error fetching reaction detail:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
