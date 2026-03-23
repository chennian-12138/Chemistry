import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { auth } from "../../lib/auth";

const router = Router();

// 记录一条浏览历史
router.post("/", async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: new Headers(req.headers as any),
    });
    const userId = session?.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "请先登录" });
    }

    const { type, targetId, title } = req.body;

    if (!type || !targetId || !title) {
      return res.status(400).json({ error: "缺少必要参数: type, targetId, title" });
    }

    // Upsert: 如果已存在同一用户+同一目标，则刷新时间戳和标题
    const record = await prisma.browsingHistory.upsert({
      where: {
        userId_type_targetId: { userId, type, targetId },
      },
      update: {
        title,
        createdAt: new Date(),
      },
      create: {
        userId,
        type,
        targetId,
        title,
      },
    });

    res.json({ success: true, data: record });
  } catch (error: any) {
    console.error("Error recording history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 获取当前用户的浏览历史
router.get("/", async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: new Headers(req.headers as any),
    });
    const userId = session?.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "请先登录" });
    }

    const limit = Math.min(Number(req.query.limit) || 20, 100);

    const records = await prisma.browsingHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        targetId: true,
        title: true,
        createdAt: true,
      },
    });

    res.json({ success: true, data: records });
  } catch (error: any) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 删除一条浏览历史
router.delete("/:id", async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: new Headers(req.headers as any),
    });
    const userId = session?.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "请先登录" });
    }

    const { id } = req.params;

    // 确保只能删除自己的历史
    const record = await prisma.browsingHistory.findUnique({ where: { id } });
    if (!record || record.userId !== userId) {
      return res.status(404).json({ error: "记录不存在" });
    }

    await prisma.browsingHistory.delete({ where: { id } });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
