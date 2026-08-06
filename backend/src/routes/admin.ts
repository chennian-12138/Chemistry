import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { requireAdmin, requireSuperAdmin } from "../../lib/guard";

const router = Router();

const ROLE_NAMES = { USER: "普通用户", ADMIN: "管理员", SUPERADMIN: "超级管理员" } as const;

// 用户列表（分页 / 搜索 / 角色筛选 / 封禁筛选）
router.get("/users", async (req, res) => {
  try {
    const userId = await requireAdmin(req, res);
    if (!userId) return;

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(req.query.pageSize as string) || 20),
    );
    const search = (req.query.search as string)?.trim() ?? "";
    const role = req.query.role as string;
    const banned = req.query.banned as string;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (role && role !== "ALL") where.role = role;
    if (banned === "true") where.banned = true;
    else if (banned === "false") where.banned = false;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          banned: true,
          banReason: true,
          banExpires: true,
          createdAt: true,
          emailVerified: true,
          _count: {
            select: {
              reactions: true,
              conversations: true,
              paperLikes: true,
              paperBookmarks: true,
            },
          },
          llmConfig: { select: { model: true, baseUrl: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        users: users.map((u) => ({
          ...u,
          roleName: ROLE_NAMES[u.role as keyof typeof ROLE_NAMES] ?? u.role,
          hasLlmConfig: !!u.llmConfig,
          llmModel: u.llmConfig?.model ?? null,
          stats: {
            reactions: u._count.reactions,
            conversations: u._count.conversations,
            paperLikes: u._count.paperLikes,
            paperBookmarks: u._count.paperBookmarks,
          },
          llmConfig: undefined,
        })),
        total,
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error("获取用户列表失败:", error);
    res.status(500).json({ error: "获取失败" });
  }
});

// 用户使用统计（管理员视角，基于 BrowsingHistory 4 大功能）
router.get("/users/:id/stats", async (req, res) => {
  try {
    const userId = await requireAdmin(req, res);
    if (!userId) return;

    const targetId = req.params.id;
    const user = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) return res.status(404).json({ error: "用户不存在" });

    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);

    const [totalGroups, recentGroups, reactions, reviews, drafts, conversations] =
      await Promise.all([
        prisma.browsingHistory.groupBy({
          by: ["type"],
          where: { userId: targetId },
          _count: { type: true },
        }),
        prisma.browsingHistory.groupBy({
          by: ["type"],
          where: { userId: targetId, createdAt: { gte: since30 } },
          _count: { type: true },
        }),
        prisma.reaction.count({ where: { authorId: targetId } }),
        prisma.review.count({ where: { reviewerId: targetId } }),
        prisma.draft.count({ where: { authorId: targetId } }),
        prisma.conversation.count({ where: { userId: targetId } }),
      ]);

    const totalMap: Record<string, number> = {};
    for (const g of totalGroups) totalMap[g.type] = g._count.type;
    const recentMap: Record<string, number> = {};
    for (const g of recentGroups) recentMap[g.type] = g._count.type;

    res.json({
      success: true,
      data: {
        user,
        browsing: {
          total: totalMap,
          recent30d: recentMap,
          totalAll: Object.values(totalMap).reduce((a, b) => a + b, 0),
        },
        content: { reactions, reviews, drafts, conversations },
      },
    });
  } catch (error) {
    console.error("获取用户统计失败:", error);
    res.status(500).json({ error: "获取失败" });
  }
});

// 修改用户角色（仅 SUPERADMIN）
router.patch("/users/:id/role", async (req, res) => {
  try {
    const operatorId = await requireSuperAdmin(req, res);
    if (!operatorId) return;

    const { role } = req.body;
    if (!["USER", "ADMIN", "SUPERADMIN"].includes(role)) {
      return res.status(400).json({ error: "无效的角色" });
    }

    const targetId = req.params.id;
    if (targetId === operatorId) {
      return res.status(400).json({ error: "不能修改自己的角色" });
    }

    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, role: true },
    });
    if (!target) return res.status(404).json({ error: "用户不存在" });

    // 防止最后一个 SUPERADMIN 被降级
    if (target.role === "SUPERADMIN" && role !== "SUPERADMIN") {
      const superAdminCount = await prisma.user.count({
        where: { role: "SUPERADMIN" },
      });
      if (superAdminCount <= 1) {
        return res.status(400).json({ error: "不能降级最后一个超级管理员" });
      }
    }

    await prisma.user.update({
      where: { id: targetId },
      data: { role },
    });

    res.json({ success: true, role });
  } catch (error) {
    console.error("修改角色失败:", error);
    res.status(500).json({ error: "修改失败" });
  }
});

// 封禁用户
router.post("/users/:id/ban", async (req, res) => {
  try {
    const operatorId = await requireAdmin(req, res);
    if (!operatorId) return;

    const targetId = req.params.id;
    if (targetId === operatorId) {
      return res.status(400).json({ error: "不能封禁自己" });
    }

    const { reason, banExpires } = req.body;

    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { role: true },
    });
    if (!target) return res.status(404).json({ error: "用户不存在" });

    // SUPERADMIN 不能被 ADMIN 封禁
    if (target.role === "SUPERADMIN") {
      const operator = await prisma.user.findUnique({
        where: { id: operatorId },
        select: { role: true },
      });
      if (operator?.role !== "SUPERADMIN") {
        return res.status(403).json({ error: "管理员不能封禁超级管理员" });
      }
    }

    await prisma.user.update({
      where: { id: targetId },
      data: {
        banned: true,
        banReason: reason || null,
        banExpires: banExpires ? new Date(banExpires) : null,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("封禁用户失败:", error);
    res.status(500).json({ error: "封禁失败" });
  }
});

// 解封用户
router.post("/users/:id/unban", async (req, res) => {
  try {
    const operatorId = await requireAdmin(req, res);
    if (!operatorId) return;

    await prisma.user.update({
      where: { id: req.params.id },
      data: { banned: false, banReason: null, banExpires: null },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("解封用户失败:", error);
    res.status(500).json({ error: "解封失败" });
  }
});

// 管理仪表盘概览统计
router.get("/overview", async (req, res) => {
  try {
    const userId = await requireAdmin(req, res);
    if (!userId) return;

    const [totalUsers, totalReactions, totalApproved, totalPending, totalRejected, totalPapers, totalConversations, totalTags] =
      await Promise.all([
        prisma.user.count(),
        prisma.reaction.count(),
        prisma.reaction.count({ where: { status: "APPROVED" } }),
        prisma.reaction.count({ where: { status: "PENDING" } }),
        prisma.reaction.count({ where: { status: "REJECTED" } }),
        prisma.paper.count(),
        prisma.conversation.count(),
        prisma.reactionTag.count(),
      ]);

    // 近 30 天新增
    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);
    const [newUsers30d, newReactions30d, reviewed30d] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: since30 } } }),
      prisma.reaction.count({ where: { createdAt: { gte: since30 } } }),
      prisma.review.count({ where: { createdAt: { gte: since30 } } }),
    ]);

    // 近 6 个月各功能使用趋势（基于 BrowsingHistory.type，平台维度）
    const months: { name: string; start: Date; end: Date }[] = [];
    const cursor = new Date();
    cursor.setMonth(cursor.getMonth() - 5);
    cursor.setDate(1);
    cursor.setHours(0, 0, 0, 0);
    for (let i = 0; i < 6; i++) {
      months.push({
        name: `${cursor.getMonth() + 1}月`,
        start: new Date(cursor),
        end: new Date(
          cursor.getFullYear(),
          cursor.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        ),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const monthlyGroups = await Promise.all(
      months.map((m) =>
        prisma.browsingHistory.groupBy({
          by: ["type"],
          where: { createdAt: { gte: m.start, lte: m.end } },
          _count: { type: true },
        }),
      ),
    );

    const FEATURE_TYPES = [
      "AI_CHAT",
      "RETRO_SYNTHESIS",
      "REACTDIC",
      "PAPER",
    ] as const;
    const featureTrend = monthlyGroups.map((groups, i) => {
      const map: Record<string, number> = {};
      for (const g of groups) map[g.type] = g._count.type;
      const monthName = months[i]?.name ?? "";
      const row: Record<string, string | number> = { name: monthName };
      for (const type of FEATURE_TYPES) row[type] = map[type] ?? 0;
      return row;
    });

    res.json({
      success: true,
      data: {
        users: { total: totalUsers, new30d: newUsers30d },
        reactions: {
          total: totalReactions,
          approved: totalApproved,
          pending: totalPending,
          rejected: totalRejected,
          new30d: newReactions30d,
        },
        papers: { total: totalPapers },
        conversations: { total: totalConversations },
        tags: { total: totalTags },
        review: { reviewed30d },
        featureTrend,
      },
    });
  } catch (error) {
    console.error("获取管理概览失败:", error);
    res.status(500).json({ error: "获取失败" });
  }
});

export default router;
