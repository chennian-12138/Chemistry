import { Router } from "express";
import { randomInt } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { auth } from "../../lib/auth";
import { sendMail, renderOtpEmail } from "../../lib/mailer";

const router = Router();

// 统一从请求里取当前登录用户
async function getUserId(req: any): Promise<string | null> {
  const session = await auth.api.getSession({
    headers: new Headers(req.headers as any),
  });
  return session?.user?.id ?? null;
}

// ========== 使用情况统计（个人维度，按 4 大主功能） ==========
// 4 大主功能对应 BrowsingHistory.type 的枚举值，顺序固定用于前端配色/排列
const FEATURE_TYPES = [
  "AI_CHAT",
  "RETRO_SYNTHESIS",
  "REACTDIC",
  "PAPER",
] as const;

// 把 prisma.groupBy(by:["type"]) 的结果压成 { type: count } 映射
function countByType(
  groups: { type: string; _count: { type: number } }[],
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const g of groups) map[g.type] = g._count.type;
  return map;
}

router.get("/stats", async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ error: "请先登录" });

    // 生成最近 6 个月的月份区间
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

    // 近 30 天区间（用于指标卡的增量）
    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);

    const [totalGroups, recentGroups, monthlyGroups] = await Promise.all([
      // 各功能累计（注意：因 upsert 去重，实为「访问过的不同资源数」）
      prisma.browsingHistory.groupBy({
        by: ["type"],
        where: { userId },
        _count: { type: true },
      }),
      // 各功能近 30 天
      prisma.browsingHistory.groupBy({
        by: ["type"],
        where: { userId, createdAt: { gte: since30 } },
        _count: { type: true },
      }),
      // 近 6 个月，每月按功能分组
      Promise.all(
        months.map((m) =>
          prisma.browsingHistory.groupBy({
            by: ["type"],
            where: { userId, createdAt: { gte: m.start, lte: m.end } },
            _count: { type: true },
          }),
        ),
      ),
    ]);

    const totalMap = countByType(totalGroups);
    const recentMap = countByType(recentGroups);
    const monthlyMaps = monthlyGroups.map(countByType);

    res.json({
      success: true,
      data: {
        // 4 张指标卡：累计总量 + 近 30 天增量
        features: FEATURE_TYPES.map((type) => ({
          type,
          total: totalMap[type] ?? 0,
          recent: recentMap[type] ?? 0,
        })),
        // 分层堆叠面积图：每月一行，各功能一列
        trend: months.map((m, i) => {
          const map = monthlyMaps[i] ?? {};
          const row: Record<string, string | number> = { name: m.name };
          for (const type of FEATURE_TYPES) row[type] = map[type] ?? 0;
          return row;
        }),
      },
    });
  } catch (error: any) {
    console.error("获取个人统计失败:", error);
    res.status(500).json({ error: "获取失败" });
  }
});

// ========== 修改邮箱（OTP 验证码方式，与注册/找回保持一致） ==========

// 用 verification 表暂存改邮箱的验证码。identifier 用固定前缀 + userId，
// value 存 "otp:newEmail"，避免验证码和目标邮箱分离。
const CHANGE_EMAIL_PREFIX = "change-email:";
const OTP_TTL_MS = 5 * 60 * 1000; // 5 分钟

function genOtp(): string {
  return String(randomInt(100000, 1000000));
}

// 第一步：发送验证码到新邮箱
router.post("/change-email/send-otp", async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ error: "请先登录" });

    const { newEmail } = req.body as { newEmail?: string };
    const email = newEmail?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "邮箱格式不正确" });
    }

    const current = await prisma.user.findUnique({ where: { id: userId } });
    if (current?.email === email) {
      return res.status(400).json({ error: "新邮箱不能与当前邮箱相同" });
    }

    // 该邮箱是否已被他人占用
    const taken = await prisma.user.findUnique({ where: { email } });
    if (taken) {
      return res.status(400).json({ error: "该邮箱已被其他账号使用" });
    }

    const otp = genOtp();
    const identifier = `${CHANGE_EMAIL_PREFIX}${userId}`;

    // 清掉旧的，再写新的（一个用户同一时刻只保留一条）
    await prisma.verification.deleteMany({ where: { identifier } });
    await prisma.verification.create({
      data: {
        id: crypto.randomUUID(),
        identifier,
        value: `${otp}:${email}`,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    await sendMail({
      to: email,
      subject: "验证你的新邮箱 - Chemistry",
      html: renderOtpEmail({
        title: "验证你的新邮箱",
        intro:
          "我们收到了修改账号邮箱的请求。请在设置页面输入以下验证码以确认这个新邮箱归你所有。",
        otp,
      }),
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("发送改邮箱验证码失败:", error);
    res.status(500).json({ error: "发送失败，请稍后重试" });
  }
});

// 第二步：校验验证码并落地新邮箱
router.post("/change-email/verify", async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ error: "请先登录" });

    const { otp } = req.body as { otp?: string };
    if (!otp || otp.length !== 6) {
      return res.status(400).json({ error: "请输入 6 位验证码" });
    }

    const identifier = `${CHANGE_EMAIL_PREFIX}${userId}`;
    const record = await prisma.verification.findFirst({
      where: { identifier },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return res.status(400).json({ error: "请先获取验证码" });
    }
    if (record.expiresAt < new Date()) {
      await prisma.verification.deleteMany({ where: { identifier } });
      return res.status(400).json({ error: "验证码已过期，请重新获取" });
    }

    const [savedOtp, newEmail] = record.value.split(":");
    if (savedOtp !== otp) {
      return res.status(400).json({ error: "验证码错误" });
    }
    if (!newEmail) {
      await prisma.verification.deleteMany({ where: { identifier } });
      return res.status(400).json({ error: "验证信息异常，请重新获取验证码" });
    }

    // 再次确认邮箱没有在这期间被占用
    const taken = await prisma.user.findUnique({ where: { email: newEmail } });
    if (taken && taken.id !== userId) {
      await prisma.verification.deleteMany({ where: { identifier } });
      return res.status(400).json({ error: "该邮箱已被其他账号使用" });
    }

    // 新邮箱已通过验证码验证，直接标记为已验证
    await prisma.user.update({
      where: { id: userId },
      data: { email: newEmail, emailVerified: true },
    });
    await prisma.verification.deleteMany({ where: { identifier } });

    res.json({ success: true, email: newEmail });
  } catch (error: any) {
    console.error("修改邮箱失败:", error);
    res.status(500).json({ error: "修改失败，请稍后重试" });
  }
});

export default router;
