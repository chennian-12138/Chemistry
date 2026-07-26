import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { matchSmartsBatch } from "../services/rdkit";

const router = Router();

// 1. Keyword Search
router.get("/search/keyword", async (req, res) => {
  try {
    const { term } = req.query;

    // We fetch all APPROVED reactions by default if no term is provided
    const whereClause = term
      ? {
          status: "APPROVED" as const,
          OR: [
            { name: { contains: String(term), mode: "insensitive" as const } },
            {
              tags: {
                some: {
                  name: {
                    contains: String(term),
                    mode: "insensitive" as const,
                  },
                },
              },
            },
            {
              sections: {
                some: {
                  descriptions: {
                    some: {
                      description: {
                        contains: String(term),
                        mode: "insensitive" as const,
                      },
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
        tags: true,
        status: true,
        sections: {
          select: {
            reactions: { select: { value: true } },
            descriptions: { select: { description: true } },
          },
        },
      },
      take: 50, // Limit results for performance
    });

    const formattedData = reactions.map((reaction) => ({
      id: reaction.id,
      name: reaction.name,
      structureData: reaction.sections?.[0]?.reactions?.[0]?.value || null,
      tags: reaction.tags.map((t: any) => t.name),
      description:
        reaction.sections
          ?.flatMap((s: any) => s.descriptions?.map((d: any) => d.description))
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
// 二部完美匹配（Kuhn 增广路）：判断 roleSmartsList 中每个角色能否被
// 一个「不同的」用户分子命中（覆盖全部角色）。用于「组合匹配」判定。
// isMatch(smarts, molIdx) = 该 smarts 是否为第 molIdx 个用户分子的子结构。
function coversAllRoles(
  roleSmartsList: string[],
  molCount: number,
  isMatch: (smarts: string, molIdx: number) => boolean,
): boolean {
  if (roleSmartsList.length === 0) return false; // 无反应物/试剂角色，不构成组合
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
        status: true,
        tags: true,
        patterns: {
          select: {
            id: true,
            molecules: { select: { smarts: true, role: true } },
          },
        },
        sections: {
          select: {
            reactions: { select: { value: true } },
            descriptions: { select: { description: true } },
          },
        },
      },
    });

    // Step 2: 收集去重的 smarts，一次批量匹配得布尔矩阵
    const uniqueSmarts = Array.from(
      new Set(
        reactions.flatMap((r) =>
          r.patterns.flatMap((p) =>
            p.molecules.map((m) => m.smarts).filter(Boolean),
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
    const REACTANT_ROLES = new Set(["反应物", "反应试剂"]);

    type Tier = "combination" | "and" | "or";
    const tierRank: Record<Tier, number> = { combination: 3, and: 2, or: 1 };

    // Step 3: 逐反应计算层级
    const hits: Array<{ reaction: (typeof reactions)[number]; tier: Tier }> = [];

    for (const reaction of reactions) {
      const allRoleSmarts = reaction.patterns.flatMap((p) =>
        p.molecules.map((m) => m.smarts).filter(Boolean),
      );
      if (allRoleSmarts.length === 0) continue;

      // 每个用户分子是否命中该反应里的任一角色
      const molMatched = molBlocks.map((_, m) =>
        allRoleSmarts.some((s) => lookup(s, m)),
      );
      const or = molMatched.some(Boolean);
      if (!or) continue; // 完全不相关

      const and = molMatched.every(Boolean);

      // combination: 存在某 pattern，其「反应物+试剂」角色被用户分子完整覆盖(单射)
      const combination = reaction.patterns.some((p) => {
        const roleSmarts = p.molecules
          .filter((m) => REACTANT_ROLES.has(m.role) && m.smarts)
          .map((m) => m.smarts);
        return coversAllRoles(roleSmarts, molCount, lookup);
      });

      const tier: Tier = combination ? "combination" : and ? "and" : "or";
      hits.push({ reaction, tier });
    }

    // Step 4: 按层级排序并映射输出
    hits.sort((a, b) => tierRank[b.tier] - tierRank[a.tier]);

    const formattedData = hits.map(({ reaction, tier }) => ({
      id: reaction.id,
      name: reaction.name,
      tags: reaction.tags.map((t: any) => t.name),
      status: reaction.status,
      matchTier: tier,
      structureData: reaction.sections?.[0]?.reactions?.[0]?.value || null,
      description:
        reaction.sections
          ?.flatMap((s: any) => s.descriptions?.map((d: any) => d.description))
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

    // Format tags into an array of strings
    const formattedReaction = {
      ...reaction,
      tags: reaction.tags ? reaction.tags.map((t: any) => t.name) : [],
    };

    res.json({ success: true, data: formattedReaction });
  } catch (error) {
    console.error("Error fetching reaction detail:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
