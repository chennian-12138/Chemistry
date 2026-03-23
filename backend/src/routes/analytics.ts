import { Router } from "express";
import { prisma } from "../../lib/prisma";

const router = Router();

router.get("/dashboard", async (req, res) => {
  try {
    // 生成最近 6 个月的月份区间
    const months = [];
    const date = new Date();
    date.setMonth(date.getMonth() - 5);
    date.setDate(1);
    date.setHours(0, 0, 0, 0);

    for (let i = 0; i < 6; i++) {
      const monthStr = date.toISOString().substring(0, 7); // YYYY-MM
      months.push({
        month: monthStr,
        name: `${date.getMonth() + 1}月`, // zh-CN format e.g. "3月", "4月"
        start: new Date(date),
        end: new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        ),
      });
      date.setMonth(date.getMonth() + 1);
    }

    // 并发查询 6 个月的数据（简单实现），如果在庞大数据集下可以使用原始 SQL GROUP BY
    const data = await Promise.all(
      months.map(async (m) => {
        const [users, reactions, clicks] = await Promise.all([
          prisma.user.count({
            where: { createdAt: { gte: m.start, lte: m.end } },
          }),
          prisma.reaction.count({
            where: {
              createdAt: { gte: m.start, lte: m.end },
              status: "APPROVED",
            },
          }),
          prisma.browsingHistory.count({
            where: { createdAt: { gte: m.start, lte: m.end } },
          }),
        ]);

        return {
          name: m.name,
          month: m.month,
          clicks,
          users,
          reactions,
        };
      }),
    );

    res.json({ success: true, data });
  } catch (error: any) {
    console.error("Analytics fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
