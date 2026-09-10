import { Router } from "express";
import { prisma } from "../../lib/prisma";

/**
 * 文献生词同步中转。
 *
 * 为什么走服务器而不是局域网直连：同网段内手机根本收不到电脑发的包
 * （能 ping 通、TCP/UDP 全超时，多半是路由器客户端隔离）。
 * 换成两端都主动连服务器，网络环境就完全无关了——手机走流量也能用。
 *
 * 认证用全局令牌（X-Sync-Token），不走 better-auth 会话：
 * Zotero 插件和安卓 App 都不方便维持登录态，一个长期令牌更合适。
 * 令牌来自环境变量 WORDSYNC_TOKEN，不设就整体关闭（返回 503），
 * 避免部署时忘了配而变成一个人人可写的公开接口。
 *
 * 队列语义：服务端只存「还没被手机取走的词」。手机 ack 后才删。
 * 取时不删——手机拿到一半断网不会丢词，代价是可能重复取到，
 * 由 App 侧的去重兜住。
 */

const router = Router();

const MAX_ENTRIES_PER_PUSH = 200;
const MAX_PULL = 500;

/** 与服务端、App 一致的字段长度上限，防止一条脏数据把卡片撑爆。 */
const LIMITS = {
  word: 80,
  meaning: 500,
  phonetic: 120,
  example: 600,
  phrases: 400,
  sourceRef: 300,
  contextSentence: 1200,
} as const;

function getToken(): string {
  return String(process.env.WORDSYNC_TOKEN || "").trim();
}

/** 定长比较：令牌是唯一凭据，别在耗时上泄露前缀信息。 */
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index++) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

function authorize(req: any, res: any): boolean {
  const expected = getToken();
  if (!expected) {
    res.status(503).json({ ok: false, error: "服务端未配置 WORDSYNC_TOKEN" });
    return false;
  }
  const provided = String(req.headers["x-sync-token"] || "").trim();
  if (!constantTimeEquals(provided, expected)) {
    res.status(401).json({ ok: false, error: "同步令牌不正确" });
    return false;
  }
  return true;
}

function normalizeText(raw: unknown, max: number): string {
  if (typeof raw !== "string") return "";
  return raw
    .normalize("NFKC")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F-\u009F]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, max);
}

function wordKeyOf(word: string): string {
  return word.trim().toLowerCase();
}

/** 累积多值字段：已存在就不重复加，保留最近 3 条。 */
function mergeMulti(existing: string, incoming: string, sep: string): string {
  const next = incoming.trim();
  if (!next) return existing;
  const parts = existing
    .split(sep)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.some((part) => part.toLowerCase() === next.toLowerCase())) {
    return parts.join(sep);
  }
  parts.push(next);
  while (parts.length > 3) parts.shift();
  return parts.join(sep);
}

// ========== 插件投递 ==========
router.post("/push", async (req: any, res: any) => {
  if (!authorize(req, res)) return;

  const body = req.body ?? {};
  const entries = Array.isArray(body.entries) ? body.entries : [];
  if (entries.length === 0) {
    return res.status(400).json({ ok: false, error: "entries 为空" });
  }
  if (entries.length > MAX_ENTRIES_PER_PUSH) {
    return res.status(400).json({
      ok: false,
      error: `单次最多 ${MAX_ENTRIES_PER_PUSH} 条，收到 ${entries.length} 条`,
    });
  }

  const batchSource = normalizeText(body.sourceRef, LIMITS.sourceRef);
  const bookName = normalizeText(body.bookName, 60);

  let added = 0;
  let updated = 0;
  let rejected = 0;

  for (const raw of entries) {
    const word = normalizeText(raw?.word, LIMITS.word);
    if (!word || word.includes("\n")) {
      rejected += 1;
      continue;
    }
    const wordKey = wordKeyOf(word);
    const incoming = {
      meaning: normalizeText(raw?.meaning, LIMITS.meaning),
      phonetic: normalizeText(raw?.phonetic, LIMITS.phonetic),
      example: normalizeText(raw?.example, LIMITS.example),
      phrases: normalizeText(raw?.phrases, LIMITS.phrases),
      sourceRef: normalizeText(raw?.sourceRef, LIMITS.sourceRef) || batchSource,
      contextSentence: normalizeText(raw?.contextSentence, LIMITS.contextSentence),
    };

    const existing = await prisma.syncWord.findUnique({ where: { wordKey } });
    if (!existing) {
      await prisma.syncWord.create({
        data: { wordKey, word, ...incoming, bookName },
      });
      added += 1;
    } else {
      // 补空字段 + 原句/来源累积：同一个词从第二篇论文推来时，
      // 新的原句要留着，旧的非空字段不能被空值覆盖。
      await prisma.syncWord.update({
        where: { wordKey },
        data: {
          meaning: existing.meaning || incoming.meaning,
          phonetic: existing.phonetic || incoming.phonetic,
          example: existing.example || incoming.example,
          phrases: existing.phrases || incoming.phrases,
          sourceRef: mergeMulti(existing.sourceRef, incoming.sourceRef, " · "),
          contextSentence: mergeMulti(
            existing.contextSentence,
            incoming.contextSentence,
            "\n\n",
          ),
          bookName: existing.bookName || bookName,
        },
      });
      updated += 1;
    }
  }

  const pending = await prisma.syncWord.count();
  return res.json({ ok: true, added, updated, rejected, pending });
});

// ========== 手机取词 ==========
router.get("/pull", async (req: any, res: any) => {
  if (!authorize(req, res)) return;

  const rows = await prisma.syncWord.findMany({
    orderBy: { createdAt: "asc" },
    take: MAX_PULL,
  });
  const total = await prisma.syncWord.count();

  return res.json({
    ok: true,
    version: 1,
    count: rows.length,
    total,
    entries: rows.map((row) => ({
      word: row.word,
      meaning: row.meaning,
      phonetic: row.phonetic,
      example: row.example,
      phrases: row.phrases,
      sourceRef: row.sourceRef,
      contextSentence: row.contextSentence,
      bookName: row.bookName,
    })),
  });
});

// ========== 手机确认收到 ==========
router.post("/ack", async (req: any, res: any) => {
  if (!authorize(req, res)) return;

  const words = Array.isArray(req.body?.words) ? req.body.words : [];
  const keys = words
    .filter((word: unknown): word is string => typeof word === "string")
    .map(wordKeyOf)
    .filter(Boolean);
  if (keys.length === 0) {
    return res.status(400).json({ ok: false, error: "words 为空" });
  }

  const result = await prisma.syncWord.deleteMany({
    where: { wordKey: { in: keys } },
  });
  const pending = await prisma.syncWord.count();
  return res.json({ ok: true, removed: result.count, pending });
});

// ========== 状态与清空（排查用） ==========
router.get("/status", async (req: any, res: any) => {
  if (!authorize(req, res)) return;
  const rows = await prisma.syncWord.findMany({
    orderBy: { createdAt: "asc" },
    take: 50,
    select: { word: true, createdAt: true, sourceRef: true },
  });
  return res.json({
    ok: true,
    pending: await prisma.syncWord.count(),
    preview: rows,
  });
});

router.delete("/pending", async (req: any, res: any) => {
  if (!authorize(req, res)) return;
  const result = await prisma.syncWord.deleteMany({});
  return res.json({ ok: true, removed: result.count });
});

export default router;
