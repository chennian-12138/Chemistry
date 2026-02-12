import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { auth } from "../../lib/auth";
import { ReviewStatus } from "../../generated/prisma/client";

const router = Router();

// 创建反应（需要登录）
router.post("/", async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: new Headers(req.headers as any),
    });
    const userId = session?.user?.id || "test-user-id";

    if (!userId) {
      return res.status(401).json({ error: "请先登录" });
    }

    const data = req.body;

    // 创建反应记录
    const reaction = await prisma.reaction.create({
      data: {
        name: data.meta.name,
        mechanismType: data.meta.mechanismType,
        form: data.meta.form,
        tags: data.meta.tags,
        status: "PENDING",
        authorId: userId,

        // 创建 SMARTS 模式（包含条件）
        patterns: {
          create: data.smartsPatterns.map((pattern: any) => ({
            name: pattern.name,
            molecules: {
              create: [
                ...pattern.patternReactants.map((m: any) => ({
                  ...m,
                  role: "反应物",
                })),
                ...pattern.patternRegents.map((m: any) => ({
                  ...m,
                  role: "反应试剂",
                })),
                ...pattern.patternProducts.map((m: any) => ({
                  ...m,
                  role: "产物",
                })),
              ],
            },
          })),
        },

        // 创建描述小节
        sections: {
          create: data.reactionSections.map((section: any) => ({
            sectionType: section.sectionType,
            temperature: section.temperature || "-",
            pressure: section.pressure || "-",
            duration: section.duration || "-",
            concentration: section.concentration || "-",
            solvent: section.solvent || "-",
            microwave: section.microwave || "-",
            acidityBasicity: section.acidityBasicity || "-",
            hydro: section.hydro || "-",

            reactions: {
              create: section.reactions.map((r: any) => ({ value: r.value })),
            },
            descriptions: {
              create: section.descriptions.map((d: any) => ({
                description: d.description,
                refPageNo: d.refPageNo,
              })),
            },
          })),
        },
      },
    });

    res.json({ success: true, data: reaction });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 查询反应
router.get("/", async (req, res) => {
  try {
    const { status } = req.query;

    const reactions = await prisma.reaction.findMany({
      where: status ? { status: status as ReviewStatus } : {},
      include: {
        author: { select: { name: true, email: true } },
        patterns: {
          include: { molecules: true },
        },
        sections: {
          include: {
            reactions: true,
            descriptions: true,
          },
        },
      },
    });

    res.json({ data: reactions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 更新已有反应（用于被拒绝后修改）
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // 先删除旧的关联数据
    await prisma.$transaction([
      // 删除 moleculeRoles
      prisma.moleculeRole.deleteMany({
        where: { pattern: { reactionId: id } }
      }),
      // 删除 patterns
      prisma.reactionPattern.deleteMany({
        where: { reactionId: id }
      }),
      // 删除 sectionReactions
      prisma.sectionReaction.deleteMany({
        where: { section: { reactionId: id } }
      }),
      // 删除 sectionDescriptions
      prisma.sectionDescription.deleteMany({
        where: { section: { reactionId: id } }
      }),
      // 删除 sections
      prisma.reactionSection.deleteMany({
        where: { reactionId: id }
      }),
    ]);

    // 更新 reaction 并重新创建关联数据
    const reaction = await prisma.reaction.update({
      where: { id },
      data: {
        name: data.meta.name,
        mechanismType: data.meta.mechanismType,
        form: data.meta.form,
        tags: data.meta.tags,
        status: "PENDING",  // 重置为待审核
        
        patterns: {
          create: data.smartsPatterns.map((pattern: any) => ({
            name: pattern.name,
            molecules: {
              create: [
                ...pattern.patternReactants.map((m: any) => ({ ...m, role: "反应物" })),
                ...pattern.patternRegents.map((m: any) => ({ ...m, role: "反应试剂" })),
                ...pattern.patternProducts.map((m: any) => ({ ...m, role: "产物" })),
              ],
            },
          })),
        },
        sections: {
          create: data.reactionSections.map((section: any) => ({
            sectionType: section.sectionType,
            temperature: section.temperature,
            pressure: section.pressure,
            duration: section.duration,
            concentration: section.concentration,
            solvent: section.solvent,
            microwave: section.microwave,
            acidityBasicity: section.acidityBasicity,
            hydro: section.hydro,
            reactions: { create: section.reactions.map((r: any) => ({ value: r.value })) },
            descriptions: { create: section.descriptions.map((d: any) => ({ ...d })) },
          })),
        },
      },
    });

    res.json({ success: true, data: reaction });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


export default router;
