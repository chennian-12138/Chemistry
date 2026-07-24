import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { auth } from "../../lib/auth";
import { expandOne, matchRoutes } from "../services/retrosynthesis";

const router = Router();

async function getSession(req: any) {
  return auth.api.getSession({ headers: new Headers(req.headers as any) });
}

// 模板名(反应名) -> 已通过审核的 Reaction.id，用于跳转反应介绍页。
// 模板既来自导入的 USPTO 反应，也来自站内审核通过的用户反应，故按 status 过滤而非 form。
async function templateReactionIdMap(
  names: (string | null | undefined)[],
): Promise<Record<string, string>> {
  const uniq = [...new Set(names.filter((n): n is string => !!n))];
  if (uniq.length === 0) return {};
  const rows = await prisma.reaction.findMany({
    where: { name: { in: uniq }, status: "APPROVED" },
    select: { id: true, name: true },
  });
  const map: Record<string, string> = {};
  for (const r of rows) map[r.name] = r.id;
  return map;
}

// 统一的路线卡片映射（列表 / 搜索共用）
function mapRouteCards(routes: any[]) {
  return routes.map((r) => {
    const values: number[] = r.steps.flatMap((s: any) =>
      s.ratings.map((x: any) => x.value),
    );
    const upvotes = values.filter((v) => v > 0).length;
    const downvotes = values.filter((v) => v < 0).length;
    const { steps, _count, ...rest } = r;
    return {
      ...rest,
      stepCount: _count.steps,
      commentCount: _count.comments,
      upvotes,
      downvotes,
      score: upvotes - downvotes,
    };
  });
}

const ROUTE_CARD_SELECT = {
  id: true,
  targetSmiles: true,
  title: true,
  description: true,
  createdAt: true,
  author: { select: { id: true, name: true, image: true } },
  _count: { select: { comments: true, steps: true } },
  steps: { select: { ratings: { select: { value: true } } } },
} as const;

// ============================================================
// 渐进式展开：对单个分子做一步逆合成（探索无需登录）
// ============================================================
router.post("/expand", async (req, res) => {
  const { smiles, maxResults } = req.body ?? {};
  if (!smiles || typeof smiles !== "string") {
    return res.status(400).json({ error: "缺少 smiles 参数" });
  }
  try {
    const result = await expandOne(smiles, maxResults ?? 25);
    // 给每种方案附上对应的 Reaction.id，方便前端跳转反应介绍页
    const idMap = await templateReactionIdMap(
      result.precursorSets.map((s) => s.templateName),
    );
    const precursorSets = result.precursorSets.map((s) => ({
      ...s,
      reactionId: idMap[s.templateName] ?? null,
    }));
    return res.json({ success: true, ...result, precursorSets });
  } catch (e: any) {
    console.error("[retro] expand error:", e);
    return res.status(502).json({ error: e.message });
  }
});

// ============================================================
// 保存一条完整路线（需登录）
// body: { targetSmiles, title?, description?, isPublic?, steps: [...] }
// step: { productSmiles, precursors: string[], templateId?, templateName?,
//         templateSmarts?, depth, parentIndex?: number | null }
// parentIndex 指向 steps 数组内的下标；根步骤为 null。
// ============================================================
router.post("/routes", async (req, res) => {
  try {
    const session = await getSession(req);
    const userId = session?.user?.id;
    if (!userId) return res.status(401).json({ error: "请先登录" });

    const {
      targetSmiles,
      title,
      description,
      isPublic = true,
      steps,
    } = req.body ?? {};

    if (!targetSmiles || typeof targetSmiles !== "string") {
      return res.status(400).json({ error: "缺少 targetSmiles" });
    }
    if (!Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: "路线至少需要一步" });
    }

    const route = await prisma.$transaction(async (tx) => {
      const created = await tx.retroRoute.create({
        data: { targetSmiles, title, description, isPublic, authorId: userId },
      });

      // 按 depth 升序创建，确保父步骤先于子步骤入库，parentIndex 可映射到已建 id。
      const idMap: Record<number, string> = {};
      const ordered = steps
        .map((s: any, i: number) => ({ s, i }))
        .sort((a, b) => (a.s.depth ?? 0) - (b.s.depth ?? 0));

      for (const { s, i } of ordered) {
        const parentIndex = s.parentIndex;
        const step = await tx.routeStep.create({
          data: {
            routeId: created.id,
            parentStepId:
              parentIndex == null ? null : idMap[parentIndex] ?? null,
            productSmiles: s.productSmiles,
            precursors: s.precursors ?? [],
            templateId: s.templateId ?? null,
            templateName: s.templateName ?? null,
            templateSmarts: s.templateSmarts ?? null,
            depth: s.depth ?? 0,
          },
        });
        idMap[i] = step.id;
      }

      return created;
    });

    return res.json({ success: true, id: route.id });
  } catch (e: any) {
    console.error("[retro] save route error:", e);
    return res.status(500).json({ error: "保存路线失败" });
  }
});

// ============================================================
// 博客式浏览：路线列表
// query: page, pageSize, sort=recent|top, withinDays(近 N 天), mine(仅自己，需登录)
// ============================================================
router.get("/routes", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(String(req.query.pageSize ?? "20"), 10) || 20),
    );
    const sort = String(req.query.sort ?? "recent");
    const withinDays = parseInt(String(req.query.withinDays ?? ""), 10);
    const mine = String(req.query.mine ?? "") === "true";

    const session = await getSession(req);
    const userId = session?.user?.id ?? null;

    const where: any = {};
    if (mine) {
      if (!userId) return res.status(401).json({ error: "请先登录" });
      where.authorId = userId; // 自己的路线不限是否公开
    } else {
      where.isPublic = true;
    }
    if (Number.isFinite(withinDays) && withinDays > 0) {
      where.createdAt = { gte: new Date(Date.now() - withinDays * 86400_000) };
    }

    const total = await prisma.retroRoute.count({ where });

    const routes = await prisma.retroRoute.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: ROUTE_CARD_SELECT,
    });

    let items = mapRouteCards(routes);
    if (sort === "top") items = items.sort((a, b) => b.score - a.score);

    return res.json({ items, page, pageSize, total });
  } catch (e: any) {
    console.error("[retro] list routes error:", e);
    return res.status(500).json({ error: "获取路线列表失败" });
  }
});

// ============================================================
// 结构搜索：找目标分子（子结构/精确）匹配的社区路线
// body: { query(SMILES/SMARTS 或 MolBlock 由前端转好的 SMILES), mode, mine? }
// ============================================================
router.post("/routes/search", async (req, res) => {
  try {
    const { query, mode = "substructure", mine = false } = req.body ?? {};
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "缺少查询结构" });
    }

    const session = await getSession(req);
    const userId = session?.user?.id ?? null;

    const where: any = {};
    if (mine) {
      if (!userId) return res.status(401).json({ error: "请先登录" });
      where.authorId = userId;
    } else {
      where.isPublic = true;
    }

    // 取候选（限量），交给 Python 做结构匹配
    const candidates = await prisma.retroRoute.findMany({
      where,
      select: { id: true, targetSmiles: true },
      take: 500,
    });

    const ids = await matchRoutes(
      query,
      mode === "exact" ? "exact" : "substructure",
      candidates.map((c) => ({ id: c.id, smiles: c.targetSmiles })),
    );

    if (ids.length === 0) return res.json({ items: [] });

    const routes = await prisma.retroRoute.findMany({
      where: { id: { in: ids } },
      select: ROUTE_CARD_SELECT,
    });
    const items = mapRouteCards(routes).sort((a, b) => b.score - a.score);
    return res.json({ items });
  } catch (e: any) {
    console.error("[retro] search routes error:", e);
    return res.status(502).json({ error: e.message || "结构搜索失败" });
  }
});

// ============================================================
// 路线详情（公开）：含步骤、每步打分聚合 + 当前用户投票、评论
// ============================================================
router.get("/routes/:id", async (req, res) => {
  try {
    const session = await getSession(req);
    const userId = session?.user?.id ?? null;

    const route = await prisma.retroRoute.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        targetSmiles: true,
        title: true,
        description: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, name: true, image: true } },
        steps: {
          orderBy: { depth: "asc" },
          select: {
            id: true,
            parentStepId: true,
            productSmiles: true,
            precursors: true,
            templateId: true,
            templateName: true,
            templateSmarts: true,
            depth: true,
            ratings: { select: { value: true, userId: true } },
          },
        },
        comments: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            content: true,
            parentId: true,
            createdAt: true,
            user: { select: { id: true, name: true, image: true } },
          },
        },
      },
    });

    if (!route) return res.status(404).json({ error: "路线不存在" });
    if (!route.isPublic && route.author.id !== userId) {
      return res.status(403).json({ error: "该路线未公开" });
    }

    // 每个步骤的模板对应的 Reaction.id（用于跳转反应介绍页）
    const idMap = await templateReactionIdMap(
      route.steps.map((s) => s.templateName),
    );

    const steps = route.steps.map((s) => {
      const up = s.ratings.filter((r) => r.value > 0).length;
      const down = s.ratings.filter((r) => r.value < 0).length;
      const myVote = userId
        ? s.ratings.find((r) => r.userId === userId)?.value ?? 0
        : 0;
      const { ratings, ...rest } = s;
      return {
        ...rest,
        reactionId: s.templateName ? idMap[s.templateName] ?? null : null,
        upvotes: up,
        downvotes: down,
        score: up - down,
        myVote,
      };
    });

    return res.json({ ...route, steps });
  } catch (e: any) {
    console.error("[retro] route detail error:", e);
    return res.status(500).json({ error: "获取路线详情失败" });
  }
});

// ============================================================
// 删除自己的路线（作者或管理员）
// ============================================================
router.delete("/routes/:id", async (req, res) => {
  try {
    const session = await getSession(req);
    const userId = session?.user?.id;
    if (!userId) return res.status(401).json({ error: "请先登录" });

    const route = await prisma.retroRoute.findUnique({
      where: { id: req.params.id },
      select: { authorId: true },
    });
    if (!route) return res.status(404).json({ error: "路线不存在" });

    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const isOwner = route.authorId === userId;
    const isAdmin = me?.role === "ADMIN" || me?.role === "SUPERADMIN";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "无权限删除" });
    }

    await prisma.retroRoute.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (e: any) {
    console.error("[retro] delete route error:", e);
    return res.status(500).json({ error: "删除失败" });
  }
});

// ============================================================
// 单步打分 👍/👎（需登录）。body: { value: 1 | -1 | 0 }，0 表示撤销
// ============================================================
router.post("/steps/:id/rate", async (req, res) => {
  try {
    const session = await getSession(req);
    const userId = session?.user?.id;
    if (!userId) return res.status(401).json({ error: "请先登录" });

    const { value } = req.body ?? {};
    if (![1, -1, 0].includes(value)) {
      return res.status(400).json({ error: "value 必须为 1 / -1 / 0" });
    }

    const step = await prisma.routeStep.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });
    if (!step) return res.status(404).json({ error: "步骤不存在" });

    if (value === 0) {
      await prisma.stepRating.deleteMany({ where: { stepId: step.id, userId } });
    } else {
      await prisma.stepRating.upsert({
        where: { userId_stepId: { userId, stepId: step.id } },
        create: { stepId: step.id, userId, value },
        update: { value },
      });
    }

    const ratings = await prisma.stepRating.findMany({
      where: { stepId: step.id },
      select: { value: true, userId: true },
    });
    const up = ratings.filter((r) => r.value > 0).length;
    const down = ratings.filter((r) => r.value < 0).length;
    const myVote = ratings.find((r) => r.userId === userId)?.value ?? 0;

    return res.json({
      success: true,
      stepId: step.id,
      upvotes: up,
      downvotes: down,
      score: up - down,
      myVote,
    });
  } catch (e: any) {
    console.error("[retro] rate step error:", e);
    return res.status(500).json({ error: "打分失败" });
  }
});

// ============================================================
// 路线评论（需登录）。body: { content, parentId? }
// ============================================================
router.post("/routes/:id/comments", async (req, res) => {
  try {
    const session = await getSession(req);
    const userId = session?.user?.id;
    if (!userId) return res.status(401).json({ error: "请先登录" });

    const { content, parentId } = req.body ?? {};
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "评论内容不能为空" });
    }

    const route = await prisma.retroRoute.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });
    if (!route) return res.status(404).json({ error: "路线不存在" });

    const comment = await prisma.routeComment.create({
      data: {
        routeId: route.id,
        userId,
        content: content.trim(),
        parentId: parentId ?? null,
      },
      select: {
        id: true,
        content: true,
        parentId: true,
        createdAt: true,
        user: { select: { id: true, name: true, image: true } },
      },
    });

    return res.json({ success: true, comment });
  } catch (e: any) {
    console.error("[retro] add comment error:", e);
    return res.status(500).json({ error: "评论失败" });
  }
});

// ============================================================
// 删除自己的评论（作者或管理员）
// ============================================================
router.delete("/comments/:id", async (req, res) => {
  try {
    const session = await getSession(req);
    const userId = session?.user?.id;
    if (!userId) return res.status(401).json({ error: "请先登录" });

    const comment = await prisma.routeComment.findUnique({
      where: { id: req.params.id },
      select: { userId: true },
    });
    if (!comment) return res.status(404).json({ error: "评论不存在" });

    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const isOwner = comment.userId === userId;
    const isAdmin = me?.role === "ADMIN" || me?.role === "SUPERADMIN";
    if (!isOwner && !isAdmin) return res.status(403).json({ error: "无权限" });

    await prisma.routeComment.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (e: any) {
    console.error("[retro] delete comment error:", e);
    return res.status(500).json({ error: "删除失败" });
  }
});

export default router;
