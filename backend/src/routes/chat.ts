import { Router } from "express";
import type { Request, Response } from "express";
import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { auth } from "../../lib/auth";
import { decryptApiKey } from "../../lib/byok-crypto";

const router = Router();

// DeepSeek 兼容 OpenAI 协议：只需 baseURL / apiKey / model
const client = new OpenAI({
  apiKey: process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL || "https://api.deepseek.com",
});
const MODEL = process.env.LLM_MODEL || "deepseek-v4-flash";

// 标题生成用更快的 flash 模型
const titleClient = new OpenAI({
  apiKey: process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL || "https://api.deepseek.com",
});
const TITLE_MODEL = process.env.LLM_TITLE_MODEL || "deepseek-v4-flash";

const SYSTEM_PROMPT =
  "你是化学科研平台的 AI 助手，擅长有机化学、反应机理、逆合成分析与文献解读。" +
  "回答使用简体中文，涉及公式或结构式时用 Markdown 清晰排版。";

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  // 思考链（仅 assistant）：落库供刷新/续聊展示；发给模型时不带（API 也会忽略）
  reasoning?: string;
  // BYOK 轮次标记（仅 assistant，落库）：该轮由用户自带 API 服务，不计入平台每日额度
  byok?: boolean;
  createdAt?: string;
}

// 会话标题：取首条用户消息前 30 字（fallback）
function makeTitle(messages: ChatMsg[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  const raw = (firstUser?.content || "新对话").trim().replace(/\s+/g, " ");
  return raw.length > 30 ? raw.slice(0, 30) + "…" : raw;
}

// 发给模型的上下文预算：从最新一条往前装，总字符数超预算即停（最新一条永远保留）。
// 按字符粗略控制即可，目的是防止马拉松式对话把模型上下文撑爆
const PROMPT_CHAR_BUDGET = 60_000;

function fitPrompt(messages: ChatMsg[]): ChatMsg[] {
  const kept: ChatMsg[] = [];
  let total = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!m) continue;
    total += m.content.length;
    kept.unshift(m);
    if (total > PROMPT_CHAR_BUDGET) break;
  }
  return kept;
}

// 用 flash 模型异步生成简短标题（非流式），失败时返回空字符串走 fallback
async function generateTitle(
  userMessage: string,
  assistantResponse: string,
): Promise<string> {
  try {
    const res = await titleClient.chat.completions.create({
      model: TITLE_MODEL,
      messages: [
        {
          role: "system",
          content:
            "你是一个标题生成器。只输出对话标题，不要任何解释。\n" +
            "规则：\n" +
            "- 使用用户消息的语言\n" +
            "- ≤20个字符\n" +
            "- 聚焦化学问题的核心主题\n" +
            "- 语法正确、自然流畅\n" +
            "- 只输出标题文本，不要引号、不要额外文字",
        },
        {
          role: "user",
          content: `为以下对话生成简短标题：\n用户问题：${userMessage}\nAI回答摘要：${assistantResponse.slice(0, 200)}`,
        },
      ],
      max_tokens: 30,
      temperature: 0.5,
      // deepseek-v4-flash 默认开思维链，会把 max_tokens 全耗在 reasoning 上导致
      // content 为空。DeepSeek 官方参数关掉思维链（须放 body 顶层，非 extra_body）。
      thinking: { type: "disabled" },
    } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming & {
      thinking: { type: "disabled" | "enabled" };
    });
    const title = res.choices[0]?.message?.content?.trim() || "";
    const clean = title.replace(/^["'「《]|["'」》]$/g, "").trim();
    return clean.length > 20 ? clean.slice(0, 20) : clean;
  } catch (err) {
    console.error("[chat] generateTitle error:", err);
    return "";
  }
}

// 用 flash 模型（关思维链）生成 3 条「用户口吻」的追问，失败时返回空数组。
// 只喂最近一轮 user+assistant，省 token；强制 JSON 输出便于解析。
async function generateSuggestions(
  userMessage: string,
  assistantResponse: string,
): Promise<string[]> {
  try {
    const res = await titleClient.chat.completions.create({
      model: TITLE_MODEL,
      messages: [
        {
          role: "system",
          content:
            "你根据上一轮对话，推测用户接下来最可能想追问的问题。\n" +
            "规则：\n" +
            "- 用「用户第一人称」口吻，如「帮我推导过渡态结构」，不要「你想了解……吗」\n" +
            "- 每条 ≤20 个字符，聚焦化学，具体可点击\n" +
            "- 使用用户消息的语言\n" +
            '- 只输出 JSON：{"suggestions":["…","…","…"]}，不要解释、不要代码块',
        },
        {
          role: "user",
          content: `用户问题：${userMessage}\nAI回答摘要：${assistantResponse.slice(0, 400)}`,
        },
      ],
      max_tokens: 200,
      temperature: 0.7,
      response_format: { type: "json_object" },
      thinking: { type: "disabled" },
    } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming & {
      thinking: { type: "disabled" | "enabled" };
    });
    const raw = res.choices[0]?.message?.content?.trim() || "";
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { suggestions?: unknown };
    if (!Array.isArray(parsed.suggestions)) return [];
    return parsed.suggestions
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .map((s) => s.trim().slice(0, 30))
      .slice(0, 3);
  } catch (err) {
    console.error("[chat] generateSuggestions error:", err);
    return [];
  }
}

// POST /api/chat —— 流式对话，结束后落库并写浏览历史
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const session = await auth.api.getSession({
    headers: new Headers(req.headers as any),
  });
  const userId = session?.user?.id;
  if (!userId) {
    res.status(401).json({ error: "请先登录" });
    return;
  }

  if (!process.env.LLM_API_KEY) {
    res.status(500).json({ error: "服务端未配置 LLM_API_KEY" });
    return;
  }

  // 每日对话限额：统计今天已落库的助手回复数（每完成一轮记 1 次），超限直接 429。
  // 以助手消息的 createdAt 为准——它由服务端在落库时盖章，客户端无法伪造；
  // 用户消息的 createdAt 来自客户端、可省略，不可作为依据。按服务器本地日期划天。
  const DAILY_LIMIT = Number(process.env.CHAT_DAILY_LIMIT) || 25;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaysConvos = await prisma.conversation.findMany({
    where: { userId, updatedAt: { gte: todayStart } },
    select: { messages: true },
  });
  let usedToday = 0;
  for (const c of todaysConvos) {
    if (!Array.isArray(c.messages)) continue;
    for (const m of c.messages as unknown as ChatMsg[]) {
      if (
        m.role === "assistant" &&
        // BYOK 轮次（落库时打标 byok=true）消耗用户自己的 key，不占平台额度
        m.byok !== true &&
        m.createdAt &&
        new Date(m.createdAt) >= todayStart
      ) {
        usedToday++;
      }
    }
  }
  // 「API 来源」为自定义时跳过平台额度逻辑，直接走用户自带 API；未配置则拒绝。
  // useByok 在此处单独读取（额度决策先于下方统一的 body 解构）
  const useByok = (req.body as { useByok?: boolean }).useByok === true;
  let byok: { apiKey: string; baseUrl: string; model: string } | null = null;
  // ADMIN / SUPERADMIN 不受平台每日额度限制（选自定义 API 时本就跳过额度，此判定只影响平台通道）
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  const quotaExempt = me?.role === "ADMIN" || me?.role === "SUPERADMIN";
  if (useByok) {
    const cfg = await prisma.userLlmConfig.findUnique({ where: { userId } });
    if (!cfg) {
      res.status(400).json({ error: "尚未配置自定义 API，请先到设置页添加" });
      return;
    }
    byok = {
      apiKey: decryptApiKey(cfg.apiKeyEnc),
      baseUrl: cfg.baseUrl,
      model: cfg.model,
    };
  } else if (!quotaExempt && usedToday >= DAILY_LIMIT) {
    // 平台额度用尽：回落到用户自带的 OpenAI 兼容配置（BYOK），未配置才 429
    const cfg = await prisma.userLlmConfig.findUnique({ where: { userId } });
    if (!cfg) {
      res
        .status(429)
        .json({ error: `今日对话次数已达上限（${DAILY_LIMIT} 次），明天再来吧` });
      return;
    }
    byok = {
      apiKey: decryptApiKey(cfg.apiKeyEnc),
      baseUrl: cfg.baseUrl,
      model: cfg.model,
    };
  }

  const { conversationId, message, deepThinking } = req.body as {
    conversationId?: string;
    // 客户端每轮只发新消息；历史由服务端从 DB 读取拼装，消息列表以服务端为权威
    message?: { content?: string };
    // 前端「深度思考」开关：true 才开思维链，默认关闭省 token
    deepThinking?: boolean;
  };

  const userContent = message?.content?.trim();
  if (!userContent) {
    res.status(400).json({ error: "缺少 message" });
    return;
  }

  // 若续聊，校验会话归属并取出服务端保存的历史
  let convo = null;
  let history: ChatMsg[] = [];
  if (conversationId) {
    convo = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!convo || convo.userId !== userId) {
      res.status(404).json({ error: "会话不存在" });
      return;
    }
    history = Array.isArray(convo.messages)
      ? (convo.messages as unknown as ChatMsg[])
      : [];
  }

  const userMsg: ChatMsg = {
    id: randomUUID(),
    role: "user",
    content: userContent,
    createdAt: new Date().toISOString(),
  };

  // SSE 响应头
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // 关闭 nginx 缓冲
  res.flushHeaders?.();

  const send = (payload: object) => {
    if (!res.writableEnded) res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  let fullText = "";
  let fullReasoning = "";
  let aborted = false;
  // 标记流是否自然跑完：只有正常结束才落库。中途 stop 会 abort 上游，
  // 此时连接已断、done 也发不出去，若照常落库会产生「孤儿会话」，
  // 前端拿不到 id，下一条消息又会再新建一条，导致侧边栏重复。
  let streamCompleted = false;

  // 只发 content：思考链不回传（DeepSeek API 也会忽略 reasoning_content）；
  // 历史经 fitPrompt 按预算裁剪，最旧的部分先丢弃
  const promptMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...fitPrompt([...history, userMsg]).map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  // BYOK 用用户自己的端点单独构造 client；thinking 参数只对 DeepSeek 端点下发
  // （其余 OpenAI 兼容端点可能拒绝未知参数——OpenAI 官方就会 400——此时思维链有无随其模型默认）
  const createStream = () => {
    if (byok) {
      const params: OpenAI.Chat.ChatCompletionCreateParamsStreaming & {
        thinking?: { type: "disabled" | "enabled" };
      } = {
        model: byok.model,
        stream: true,
        messages: promptMessages,
      };
      if (byok.baseUrl.includes("api.deepseek.com")) {
        params.thinking = { type: deepThinking === true ? "enabled" : "disabled" };
      }
      return new OpenAI({
        apiKey: byok.apiKey,
        baseURL: byok.baseUrl,
      }).chat.completions.create(params);
    }
    return client.chat.completions.create({
      model: MODEL,
      stream: true,
      // 深度思考由前端开关控制：开启才输出思考链（delta.reasoning_content），默认关闭省 token
      thinking: { type: deepThinking === true ? "enabled" : "disabled" },
      messages: promptMessages,
    } as OpenAI.Chat.ChatCompletionCreateParamsStreaming & {
      thinking: { type: "disabled" | "enabled" };
    });
  };

  let stream: Awaited<ReturnType<typeof createStream>>;
  try {
    stream = await createStream();
  } catch (err) {
    if (!byok) throw err; // 平台路径保持原行为
    console.error("[chat] byok stream create error:", err);
    send({
      type: "error",
      error: "自定义 API 调用失败，请检查设置页中的 API 配置",
    });
    if (!res.writableEnded) res.end();
    return;
  }

  // 客户端断开：中止上游流
  req.on("close", () => {
    aborted = true;
    try {
      stream.controller.abort();
    } catch {
      /* noop */
    }
  });

  try {
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta as
        | { content?: string; reasoning_content?: string }
        | undefined;
      // 思考链与正文同级：reasoning_content 先到（思考阶段），content 后到（正文阶段）
      const reasoning = delta?.reasoning_content || "";
      if (reasoning) {
        fullReasoning += reasoning;
        send({ type: "reasoning", content: reasoning });
      }
      const text = delta?.content || "";
      if (text) {
        fullText += text;
        send({ type: "delta", content: text });
      }
    }
    streamCompleted = true;
  } catch (err) {
    if (!aborted) {
      console.error("[chat] stream error:", err);
      send({
        type: "error",
        error: byok
          ? "自定义 API 调用失败，请检查设置页中的 API 配置"
          : "生成失败，请重试",
      });
    }
  }

  // 落库：把本轮 user + assistant 追加进会话（仅在流自然结束时；中途 stop 直接跳过）
  try {
    if (streamCompleted && fullText.trim()) {
      const assistantMsg: ChatMsg = {
        id: randomUUID(),
        role: "assistant",
        content: fullText,
        // 落库思考链（有才存），刷新/续聊时可回显；下一轮映射时不带上
        ...(fullReasoning.trim() ? { reasoning: fullReasoning } : {}),
        // BYOK 轮次打标：额度计数时跳过，不消耗平台每日 25 次
        ...(byok ? { byok: true } : {}),
        createdAt: new Date().toISOString(),
      };
      const nextMessages = [...history, userMsg, assistantMsg];

      // 新会话：用 flash 模型生成标题；续聊沿用原标题
      let historyTitle: string;
      if (convo) {
        historyTitle = convo.title;
      } else {
        const generated = await generateTitle(userContent, fullText);
        historyTitle = generated || makeTitle([userMsg]);
      }

      let savedId: string;
      if (convo) {
        await prisma.conversation.update({
          where: { id: convo.id },
          data: { messages: nextMessages as any },
        });
        savedId = convo.id;
      } else {
        const created = await prisma.conversation.create({
          data: {
            userId,
            title: historyTitle,
            messages: nextMessages as any,
          },
        });
        savedId = created.id;
      }

      // 写浏览历史（type=AI_CHAT，targetId=会话id）供侧边栏取用
      await prisma.browsingHistory.upsert({
        where: {
          userId_type_targetId: {
            userId,
            type: "AI_CHAT",
            targetId: savedId,
          },
        },
        update: { title: historyTitle, createdAt: new Date() },
        create: {
          userId,
          type: "AI_CHAT",
          targetId: savedId,
          title: historyTitle,
        },
      });

      send({
        type: "done",
        conversationId: savedId,
        messageId: assistantMsg.id,
        title: historyTitle,
        // 本轮实际由谁服务：用户选平台但被兜底切到 BYOK 时，前端据此提示
        via: byok ? "byok" : "platform",
      });

      // 追问：用本轮 user+assistant 生成 3 条，经同一条 SSE 通道回传。
      // 放在 done 之后，即使追问失败也不影响主流程。
      const suggestions = await generateSuggestions(userContent, fullText);
      if (suggestions.length > 0) {
        send({ type: "suggestions", items: suggestions });
      }
    }
  } catch (err) {
    console.error("[chat] persist error:", err);
    send({ type: "error", error: "保存会话失败" });
  }

  if (!res.writableEnded) res.end();
});

// GET /api/chat/conversations —— 当前用户会话列表（不含正文）
router.get(
  "/conversations",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const session = await auth.api.getSession({
        headers: new Headers(req.headers as any),
      });
      const userId = session?.user?.id;
      if (!userId) {
        res.status(401).json({ error: "请先登录" });
        return;
      }

      const list = await prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, createdAt: true, updatedAt: true },
      });
      res.json({ success: true, data: list });
    } catch (err) {
      console.error("GET /chat/conversations error:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// GET /api/chat/conversations/:id —— 单个会话完整消息
router.get(
  "/conversations/:id",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const session = await auth.api.getSession({
        headers: new Headers(req.headers as any),
      });
      const userId = session?.user?.id;
      if (!userId) {
        res.status(401).json({ error: "请先登录" });
        return;
      }

      const convoId = req.params.id as string;
      const convo = await prisma.conversation.findUnique({
        where: { id: convoId },
      });
      if (!convo || convo.userId !== userId) {
        res.status(404).json({ error: "会话不存在" });
        return;
      }
      res.json({ success: true, data: convo });
    } catch (err) {
      console.error("GET /chat/conversations/:id error:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// DELETE /api/chat/conversations/:id —— 删除会话 + 对应浏览历史
router.delete(
  "/conversations/:id",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const session = await auth.api.getSession({
        headers: new Headers(req.headers as any),
      });
      const userId = session?.user?.id;
      if (!userId) {
        res.status(401).json({ error: "请先登录" });
        return;
      }

      const convoId = req.params.id as string;
      const convo = await prisma.conversation.findUnique({
        where: { id: convoId },
      });
      if (!convo || convo.userId !== userId) {
        res.status(404).json({ error: "会话不存在" });
        return;
      }

      await prisma.conversation.delete({ where: { id: convo.id } });
      await prisma.browsingHistory
        .delete({
          where: {
            userId_type_targetId: {
              userId,
              type: "AI_CHAT",
              targetId: convo.id,
            },
          },
        })
        .catch(() => {
          /* 历史可能不存在，忽略 */
        });

      res.json({ success: true });
    } catch (err) {
      console.error("DELETE /chat/conversations/:id error:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

export default router;
