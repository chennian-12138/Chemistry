import { Router } from "express";
import { prisma } from "../../lib/prisma";
import {auth} from "../../lib/auth";

const router = Router();

// 获取拒绝词条
router.get("/rejected", async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: new Headers(req.headers as any)
    });
    const userId = session?.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "请先登录" });
    }

    const entries = await prisma.reaction.findMany({
      where: {
        status: "REJECTED", 
        authorId: userId,
      },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
        patterns: {
          include: {
            molecules: true, // 分子角色（反应物/试剂/产物）
          },
        },
        sections: {
          include: {
            reactions: true, // 反应式（Kekule JSON）
            descriptions: true, // 描述文本
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 格式化成前端需要的结构
    const formatted = entries.map((entry) => ({
      id: entry.id,
      name: entry.name,
      reviewed: entry.status !== "PENDING", // 是否已审核
      uploadedBy: entry.author?.name || entry.author?.email || "未知",
      // 完整数据，格式化成 DataupSchema
      fullData: {
        meta: {
          name: entry.name,
          mechanismType: entry.mechanismType,
          form: entry.form,
          tags: entry.tags || "",
        },
        // 把 patterns 转换成 smartsPatterns 格式
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
          // 反应条件从 pattern 里取
        })),
        // 描述小节
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
    }));

    res.json(formatted);
  } catch (error) {
    console.error("获取待审核词条失败:", error);
    res.status(500).json({ error: "获取失败" });
  }
});

router.get("/list", async (req, res) => {
  try {
    const entries = await prisma.reaction.findMany({
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

// 删除词条
router.delete("/:id", async (req, res) => {
  try {
    await prisma.reaction.delete({
      where: { id: req.params.id },
    });
    res.json({ message: "词条删除成功" });
  } catch (error) {
    console.error("删除词条失败:", error);
    res.status(500).json({ error: "删除失败" });
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

// 审核通过
router.post("/:id/approve", async (req, res) => {
  try {
    await prisma.reaction.update({
      where: { id: req.params.id },
      data: { status: "APPROVED" }
    })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: "审核失败" })
  }
})

// 审核拒绝
router.post("/:id/reject", async (req, res) => {
  try {
    const { reason } = req.body
    await prisma.reaction.update({
      where: { id: req.params.id },
      data: { 
        status: "REJECTED",
        // 如果需要记录原因，需要在 schema 中添加字段
      }
    })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: "拒绝失败" })
  }
})



export default router;
