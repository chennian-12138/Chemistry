import e, { Router } from "express";
import { prisma } from "../../lib/prisma";

const router = Router();

// 给审核列表页用的简化路由（只返回基本信息）
router.get("/list", async (req, res) => {
  try {
    const entries = await prisma.reaction.findMany({
      where: { status: "PENDING" },
      include: {
        author: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    // 简化返回，只给列表需要的数据
    const list = entries.map(entry => ({
      id: entry.id,
      name: entry.name,
      uploadedBy: entry.author?.name || entry.author?.email || "未知",
      status: entry.status,
      createdAt: entry.createdAt,
    }));

    res.json(list);
  } catch (error) {
    console.error("获取审核列表失败:", error);
    res.status(500).json({ error: "获取失败" });
  }
});

// 获取单个词条详情（审核页用）
router.get("/:id", async (req, res) => {
  try {
    const entry = await prisma.reaction.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { name: true, email: true } },
        patterns: { include: { molecules: true } },
        sections: {
          include: {
            reactions: true,
            descriptions: true,
          },
        },
      },
    });

    if (!entry) {
      return res.status(404).json({ error: "词条不存在" });
    }

    // 格式化成前端需要的结构
    const formatted = {
      id: entry.id,
      name: entry.name,
      uploadedBy: entry.author?.name || entry.author?.email || "未知",
      fullData: {
        meta: {
          name: entry.name,
          mechanismType: entry.mechanismType,
          form: entry.form,
          tags: entry.tags || "",
        },
        smartsPatterns: entry.patterns.map((pattern) => ({
          name: pattern.name,
          patternReactants: pattern.molecules
            .filter((m) => m.role === "反应物")
            .map((m) => ({ smarts: m.smarts, name: m.name, role: m.role })),
          patternRegents: pattern.molecules
            .filter((m) => m.role === "反应试剂")
            .map((m) => ({ smarts: m.smarts, name: m.name, role: m.role })),
          patternProducts: pattern.molecules
            .filter((m) => m.role === "产物")
            .map((m) => ({ smarts: m.smarts, name: m.name, role: m.role })),
        })),
        reactionSections: entry.sections.map((section) => ({
          sectionType: section.sectionType,
          temperature: section.temperature,
          pressure: section.pressure,
          duration: section.duration,
          concentration: section.concentration,
          solvent: section.solvent,
          microwave: section.microwave,
          acidityBasicity: section.acidityBasicity,
          hydro: section.hydro,
          reactions: section.reactions.map((r) => ({ value: r.value })),
          descriptions: section.descriptions.map((d) => ({
            description: d.description,
            refPageNo: d.refPageNo || "",
          })),
        })),
      },
    };

    res.json(formatted);
  } catch (error) {
    console.error("获取词条详情失败:", error);
    res.status(500).json({ error: "获取失败" });
  }
});

export default router;