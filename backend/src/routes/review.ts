import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { auth } from "../../lib/auth";
import { requireAdmin } from "../../lib/guard";

const router = Router();

/**
 * 将数据库中保存的 reaction pattern 恢复成 DataUp 的可编辑表单结构。
 *
 * 说明：上传提交前系统已经强制完成 SMARTS 校验和反应预测校验，因此凡是能够进入
 * PENDING/REJECTED 状态的数据，都意味着提交当时的校验已通过。数据库为了精简没有
 * 保存这些临时校验位，这里在“打回修改”场景下统一恢复为已校验，避免用户仅仅因为
 * 被打回就需要把同一份已通过的数据再校验一遍。若用户在表单中实际修改了 SMARTS，
 * 前端 SMARTSModuleData 的 onChange 会自动把对应 validated / reactionPredictValidated
 * 置为 false，仍会要求重新校验。
 */
function toEditableSmartsPattern(pattern: any) {
  const molecule = (m: any) => ({
    smarts: m.smarts,
    name: m.name,
    role: m.role,
    validated: true,
  });

  return {
    name: pattern.name,
    patternReactants: pattern.molecules
      .filter((m: any) => m.role === "反应物")
      .map(molecule),
    patternRegents: pattern.molecules
      .filter((m: any) => m.role === "反应试剂")
      .map(molecule),
    patternProducts: pattern.molecules
      .filter((m: any) => m.role === "产物")
      .map(molecule),
    reactionPredictValidated: true,
  };
}

// 获取拒绝词条
router.get("/rejected", async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: new Headers(req.headers as any),
    });
    const userId = session?.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "请先登录" });
    }

    // 查询用户角色
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // SUPERADMIN 可以看到所有被拒词条，普通用户只能看自己的
    const whereClause =
      currentUser?.role === "SUPERADMIN"
        ? { status: "REJECTED" as const }
        : { status: "REJECTED" as const, authorId: userId };

    const entries = await prisma.reaction.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
        reviews: {
          where: {
            status: "REJECTED",
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
        patterns: {
          include: {
            molecules: true, // 分子角色（反应物/试剂/产物）
          },
        },
        tags: true,
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
      rejectReason: entry.reviews?.[0]?.comment || "未知原因",
      // 完整数据，格式化成 DataupSchema
      fullData: {
        meta: {
          name: entry.name,
          mechanismType: entry.mechanismType,
          form: entry.form,
          tags: entry.tags.map((t: any) => t.name).join(", "),
        },
        // 把 patterns 转换成 smartsPatterns 格式（并恢复已校验状态）
        smartsPatterns: entry.patterns.map(toEditableSmartsPattern),
        // 描述小节
        reactionSections: entry.sections.map((section: any) => ({
          sectionType: section.sectionType,
          temperature: section.temperature || "-",
          pressure: section.pressure || "-",
          duration: section.duration || "-",
          concentration: section.concentration || "-",
          solvent: section.solvent || "-",
          microwave: section.microwave || "-",
          acidityBasicity: section.acidityBasicity || "-",
          hydro: section.hydro || "-",
          reactions: section.reactions.map((r: any) => ({ value: r.value })),
          descriptions: section.descriptions.map((d: any) => ({
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

// 审核列表
router.get("/list", async (req, res) => {
  try {
    const userId = await requireAdmin(req, res);
    if (!userId) return;

    const entries = await prisma.reaction.findMany({
      include: {
        author: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 简化返回，只给列表需要的数据
    const list = entries.map((entry) => ({
      id: entry.id,
      name: entry.name,
      uploadedBy: entry.author?.name || entry.author?.email || "未知",
      status: entry.status,
      createdAt: entry.createdAt,
      mechanismType: entry.mechanismType,
      form: entry.form,
    }));

    res.json(list);
  } catch (error) {
    console.error("获取审核列表失败:", error);
    res.status(500).json({ error: "获取失败" });
  }
});

// 审核统计（管理员看板：状态分布 / 近期审核量 / 平均处理时长）
router.get("/stats", async (req, res) => {
  try {
    const userId = await requireAdmin(req, res);
    if (!userId) return;

    const [pending, approved, rejected, total, reviews] = await Promise.all([
      prisma.reaction.count({ where: { status: "PENDING" } }),
      prisma.reaction.count({ where: { status: "APPROVED" } }),
      prisma.reaction.count({ where: { status: "REJECTED" } }),
      prisma.reaction.count(),
      prisma.review.findMany({
        include: {
          reaction: { select: { name: true, status: true } },
          reviewer: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    // 近 7 天每天审核量
    const since7d: { name: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      const count = await prisma.review.count({
        where: { createdAt: { gte: dayStart, lte: dayEnd } },
      });
      since7d.push({
        name: `${dayStart.getMonth() + 1}/${dayStart.getDate()}`,
        count,
      });
    }

    res.json({
      success: true,
      data: {
        status: { pending, approved, rejected, total },
        recentReviews: reviews.map((r) => ({
          id: r.id,
          status: r.status,
          comment: r.comment,
          createdAt: r.createdAt,
          reactionName: r.reaction?.name ?? "未知",
          reviewerName: r.reviewer?.name ?? r.reviewer?.email ?? "未知",
        })),
        last7d: since7d,
      },
    });
  } catch (error) {
    console.error("获取审核统计失败:", error);
    res.status(500).json({ error: "获取失败" });
  }
});

// 删除词条
router.delete("/:id", async (req, res) => {
  try {
    const userId = await requireAdmin(req, res);
    if (!userId) return;

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
    const userId = await requireAdmin(req, res);
    if (!userId) return;

    const entry = await prisma.reaction.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { name: true, email: true } },
        tags: true,
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
      status: entry.status,
      createdAt: entry.createdAt,
      uploadedBy: entry.author?.name || entry.author?.email || "未知",
      fullData: {
        meta: {
          name: entry.name,
          mechanismType: entry.mechanismType,
          form: entry.form,
          tags: entry.tags.map((t: any) => t.name).join(", "),
        },
        smartsPatterns: entry.patterns.map(toEditableSmartsPattern),
        reactionSections: entry.sections.map((section: any) => ({
          sectionType: section.sectionType,
          temperature: section.temperature || "-",
          pressure: section.pressure || "-",
          duration: section.duration || "-",
          concentration: section.concentration || "-",
          solvent: section.solvent || "-",
          microwave: section.microwave || "-",
          acidityBasicity: section.acidityBasicity || "-",
          hydro: section.hydro || "-",
          reactions: section.reactions.map((r: any) => ({ value: r.value })),
          descriptions: section.descriptions.map((d: any) => ({
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
    const reviewerId = await requireAdmin(req, res);
    if (!reviewerId) return;

    await prisma.$transaction([
      prisma.reaction.update({
        where: { id: req.params.id },
        data: { status: "APPROVED" },
      }),
      prisma.review.create({
        data: {
          reactionId: req.params.id,
          reviewerId,
          status: "APPROVED",
        },
      }),
    ]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "审核失败" });
  }
});

// 审核拒绝
router.post("/:id/reject", async (req, res) => {
  try {
    const { reason } = req.body;
    const reviewerId = await requireAdmin(req, res);
    if (!reviewerId) return;

    await prisma.$transaction([
      prisma.reaction.update({
        where: { id: req.params.id },
        data: {
          status: "REJECTED",
        },
      }),
      prisma.review.create({
        data: {
          reactionId: req.params.id,
          reviewerId,
          status: "REJECTED",
          comment: reason,
        },
      }),
    ]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "拒绝失败" });
  }
});

export default router;
