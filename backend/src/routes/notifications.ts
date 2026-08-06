import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { requireUser } from "../../lib/guard";

const router = Router();

// 我的消息列表（新→旧）
router.get("/", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));

    const [total, unreadCount, records] = await Promise.all([
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, read: false } }),
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          type: true,
          postId: true,
          message: true,
          read: true,
          createdAt: true,
        },
      }),
    ]);

    res.json({ success: true, data: { notifications: records, total, unreadCount, page, pageSize } });
  } catch (error: any) {
    console.error("Error listing notifications:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 未读数（侧边栏徽标轮询用）
router.get("/unread-count", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;

    const count = await prisma.notification.count({
      where: { userId, read: false },
    });
    res.json({ success: true, data: { count } });
  } catch (error: any) {
    console.error("Error counting notifications:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 全部标记已读（须在 /:id/read 之前注册，否则被 :id 捕获）
router.post("/read-all", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;

    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error marking all notifications read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 单条标记已读（仅限本人）
router.post("/:id/read", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;

    const { id } = req.params;
    const record = await prisma.notification.findUnique({ where: { id } });
    if (!record || record.userId !== userId) {
      return res.status(404).json({ error: "消息不存在" });
    }

    await prisma.notification.update({ where: { id }, data: { read: true } });
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error marking notification read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
