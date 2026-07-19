import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { auth } from "../../lib/auth";

const router = Router();

// ---------- 辅助：获取当前登录用户 ----------
async function getSession(req: any) {
  return auth.api.getSession({ headers: new Headers(req.headers as any) });
}

// ---------- GET /api/papers ----------
// 列表查询，支持关键词搜索、subfield 过滤、排序、分页
router.get("/", async (req, res) => {
  try {
    const session = await getSession(req);
    const userId = session?.user?.id ?? null;

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const keyword = (req.query.keyword as string | undefined)?.trim();
    const subfieldId = req.query.subfieldId as string | undefined;
    const sortParam = req.query.sort as string | undefined;
    const articleType = (req.query.articleType as string | undefined)?.trim();
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const journal = (req.query.journal as string | undefined)?.trim();

    // 排序字段映射：likes -> likeCount，impact -> impactFactor，默认 publishedDate
    const sortField =
      sortParam === "likes"
        ? "likeCount"
        : sortParam === "impact"
          ? "impactFactor"
          : "publishedDate";

    const where: any = {};

    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: "insensitive" } },
        { abstract: { contains: keyword, mode: "insensitive" } },
      ];
    }

    if (subfieldId) {
      where.subfields = { some: { id: subfieldId } };
    }

    // 文章类型：article / review（不区分大小写）
    if (articleType && articleType !== "all") {
      where.articleType = { equals: articleType, mode: "insensitive" };
    }

    // 日期区间
    if (dateFrom || dateTo) {
      where.publishedDate = {};
      if (dateFrom) where.publishedDate.gte = new Date(dateFrom);
      if (dateTo) where.publishedDate.lte = new Date(dateTo);
    }

    // 期刊名精确筛选
    if (journal) {
      where.journalName = journal;
    }

    const [total, papers] = await Promise.all([
      prisma.paper.count({ where }),
      prisma.paper.findMany({
        where,
        orderBy:
          sortField === "impactFactor"
            ? { impactFactor: { sort: "desc", nulls: "last" } }
            : { [sortField]: "desc" },
        skip,
        take: limit,
        include: {
          subfields: { select: { id: true, displayNameZh: true } },
          ...(userId
            ? {
                likes: { where: { userId }, select: { id: true } },
                bookmarks: { where: { userId }, select: { id: true } },
              }
            : {}),
        },
      }),
    ]);

    const data = papers.map((p) => ({
      ...p,
      liked: userId ? (p as any).likes?.length > 0 : false,
      bookmarked: userId ? (p as any).bookmarks?.length > 0 : false,
      likes: undefined,
      bookmarks: undefined,
    }));

    res.json({ success: true, data, total, page, limit });
  } catch (e: any) {
    console.error("[papers] list error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------- POST /api/papers/trigger-daily ----------
// 仅 SUPERADMIN：手动触发一次增量爬取（调试用），转发到 Python 服务
router.post("/trigger-daily", async (req, res) => {
  try {
    const session = await getSession(req);
    const userId = session?.user?.id;
    if (!userId) return res.status(401).json({ error: "请先登录" });

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (currentUser?.role !== "SUPERADMIN") {
      return res.status(403).json({ error: "无权限" });
    }

    const pythonUrl = process.env.PYTHON_URL || "http://127.0.0.1:5000";
    const response = await fetch(`${pythonUrl}/api/papers/trigger-daily`, {
      method: "POST",
    });

    if (!response.ok) {
      const detail = await response.text();
      return res
        .status(502)
        .json({ error: `Python 服务调用失败: ${detail || response.statusText}` });
    }

    const result = await response.json();
    res.json({ success: true, ...result });
  } catch (e: any) {
    console.error("[papers] trigger-daily error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------- GET /api/papers/top-journals ----------
// 返回库中影响因子最高的前 10 个期刊（用于前端期刊筛选下拉）
router.get("/top-journals", async (_req, res) => {
  try {
    // 按期刊聚合，取每个期刊的 IF（同名期刊 IF 一致），按 IF 降序取前 10
    const rows = await prisma.paper.groupBy({
      by: ["journalName", "impactFactor"],
      where: { journalName: { not: null }, impactFactor: { not: null } },
      _count: { _all: true },
      orderBy: { impactFactor: "desc" },
      take: 10,
    });

    const data = rows.map((r) => ({
      journalName: r.journalName,
      impactFactor: r.impactFactor,
      count: r._count._all,
    }));

    res.json({ success: true, data });
  } catch (e: any) {
    console.error("[papers] top-journals error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------- GET /api/papers/subfields ----------
// 返回所有可用 subfield（用于前端筛选器）
router.get("/subfields", async (_req, res) => {
  try {
    const subfields = await prisma.paperSubfield.findMany({
      orderBy: { displayNameZh: "asc" },
      select: { id: true, displayName: true, displayNameZh: true },
    });
    res.json({ success: true, data: subfields });
  } catch (e: any) {
    console.error("[papers] subfields error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------- GET /api/papers/bookmarks ----------
// 当前用户收藏的文献列表
router.get("/bookmarks", async (req, res) => {
  try {
    const session = await getSession(req);
    const userId = session?.user?.id;
    if (!userId) return res.status(401).json({ error: "请先登录" });

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [total, bookmarks] = await Promise.all([
      prisma.paperBookmark.count({ where: { userId } }),
      prisma.paperBookmark.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          paper: {
            include: {
              subfields: { select: { id: true, displayNameZh: true } },
              likes: { where: { userId }, select: { id: true } },
            },
          },
        },
      }),
    ]);

    const data = bookmarks.map((b) => ({
      ...b.paper,
      liked: (b.paper as any).likes?.length > 0,
      bookmarked: true,
      likes: undefined,
    }));

    res.json({ success: true, data, total, page, limit });
  } catch (e: any) {
    console.error("[papers] bookmarks error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------- GET /api/papers/:id ----------
// 单篇文献详情
router.get("/:id", async (req, res) => {
  try {
    const session = await getSession(req);
    const userId = session?.user?.id ?? null;

    const paper = await prisma.paper.findUnique({
      where: { id: req.params.id },
      include: {
        subfields: { select: { id: true, displayNameZh: true } },
        ...(userId
          ? {
              likes: { where: { userId }, select: { id: true } },
              bookmarks: { where: { userId }, select: { id: true } },
            }
          : {}),
      },
    });

    if (!paper) return res.status(404).json({ error: "文献不存在" });

    res.json({
      success: true,
      data: {
        ...paper,
        liked: userId ? (paper as any).likes?.length > 0 : false,
        bookmarked: userId ? (paper as any).bookmarks?.length > 0 : false,
        likes: undefined,
        bookmarks: undefined,
      },
    });
  } catch (e: any) {
    console.error("[papers] detail error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------- POST /api/papers/:id/like ----------
// 切换点赞（toggle）
router.post("/:id/like", async (req, res) => {
  try {
    const session = await getSession(req);
    const userId = session?.user?.id;
    if (!userId) return res.status(401).json({ error: "请先登录" });

    const paperId = req.params.id;
    const existing = await prisma.paperLike.findUnique({
      where: { userId_paperId: { userId, paperId } },
    });

    if (existing) {
      // 取消点赞
      await prisma.$transaction([
        prisma.paperLike.delete({ where: { id: existing.id } }),
        prisma.paper.update({
          where: { id: paperId },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      res.json({ success: true, liked: false });
    } else {
      // 点赞
      await prisma.$transaction([
        prisma.paperLike.create({ data: { userId, paperId } }),
        prisma.paper.update({
          where: { id: paperId },
          data: { likeCount: { increment: 1 } },
        }),
      ]);
      res.json({ success: true, liked: true });
    }
  } catch (e: any) {
    console.error("[papers] like error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------- POST /api/papers/:id/bookmark ----------
// 切换收藏（toggle）
router.post("/:id/bookmark", async (req, res) => {
  try {
    const session = await getSession(req);
    const userId = session?.user?.id;
    if (!userId) return res.status(401).json({ error: "请先登录" });

    const paperId = req.params.id;
    const existing = await prisma.paperBookmark.findUnique({
      where: { userId_paperId: { userId, paperId } },
    });

    if (existing) {
      await prisma.paperBookmark.delete({ where: { id: existing.id } });
      res.json({ success: true, bookmarked: false });
    } else {
      await prisma.paperBookmark.create({ data: { userId, paperId } });
      res.json({ success: true, bookmarked: true });
    }
  } catch (e: any) {
    console.error("[papers] bookmark error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
