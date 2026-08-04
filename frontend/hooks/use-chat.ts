"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Message } from "@/components/ui/chat-message";

const API_BASE =
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:8000";

// API 来源：platform=平台每日额度 / byok=用户自定义 API
export type ChatProvider = "platform" | "byok";

// 后端 SSE 事件（done 带 via：本轮实际走了平台额度还是自定义 API——
// 选了平台额度但配额用尽且有 BYOK 配置时，后端会静默回退，via 为 "byok"）
type StreamEvent =
  | { type: "reasoning"; content: string }
  | { type: "delta"; content: string }
  | {
      type: "done";
      conversationId: string;
      messageId: string;
      title: string;
      via?: "platform" | "byok";
    }
  | { type: "suggestions"; items: string[] }
  | { type: "error"; error: string };

export interface UseChatOptions {
  // 已有会话 id（续聊页传入）
  conversationId?: string;
  // 初始消息（续聊页拉取历史后传入）
  initialMessages?: Message[];
  // 新会话首次落库后回调（携带 id + 标题），用于跳转 & 同步侧边栏
  onConversationCreated?: (conversationId: string, title: string) => void;
  // 每轮完成回调（新建或续聊都会触发），用于刷新侧边栏时间戳
  onFinish?: (conversationId: string, title: string) => void;
  // 出错回调
  onError?: (message: string) => void;
  // 非错误提示回调：如平台额度用尽被静默回退到自定义 API 时通知用户
  onNotice?: (message: string) => void;
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

// 当日限额锁的 localStorage key：值是本地日期 YYYY-MM-DD，与当天比较即自然过期，
// 无需手动清除（reset 新对话也不清——配额按天计，不按会话计）
const QUOTA_LATCH_KEY = "askai-quota-limited";

// 本地日期 YYYY-MM-DD。不用 toISOString：那是 UTC，跨时区会把「今天」算偏
function todayKey() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// 当日是否已撞 429 限额（guard window 防 SSR 期访问 localStorage）
function isQuotaLimitedToday() {
  return (
    typeof window !== "undefined" &&
    localStorage.getItem(QUOTA_LATCH_KEY) === todayKey()
  );
}

// 限额标记气泡：仅会话内展示不落库——每轮只把新用户消息发后端（历史由服务端按
// conversationId 从 DB 拼装），该标记天然不上行；追加后最后一条变为 assistant，
// MessageList 的三点动画（isTyping=最后一条是 user）也随之不出现
function limitedMarkerMsg(): Message {
  return {
    id: newId(),
    role: "assistant",
    content: "",
    limited: true,
    createdAt: new Date(),
  };
}

export function useChat({
  conversationId,
  initialMessages = [],
  onConversationCreated,
  onFinish,
  onError,
  onNotice,
}: UseChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  // 后端在每轮结束后经 SSE 回传的动态追问（用户口吻）；发新消息时清空
  const [suggestions, setSuggestions] = useState<string[]>([]);
  // 深度思考开关：开启后请求带 deepThinking，后端回传 reasoning_content 思考链。
  // 偏好持久化到 localStorage（guard window 防 SSR 期访问），reset（新对话）不重置它
  const [deepThinking, setDeepThinking] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem("askai-deep-thinking") === "1",
  );

  useEffect(() => {
    localStorage.setItem("askai-deep-thinking", deepThinking ? "1" : "0");
  }, [deepThinking]);

  const toggleDeepThinking = useCallback(
    () => setDeepThinking((v) => !v),
    [],
  );

  // API 来源开关：byok 时请求带 useByok，走后端自定义 API 通道、不占平台配额。
  // 偏好持久化到 localStorage（guard window 防 SSR 期访问），reset（新对话）不重置它
  const [provider, setProvider] = useState<ChatProvider>(() =>
    typeof window !== "undefined" &&
    localStorage.getItem("askai-provider") === "byok"
      ? "byok"
      : "platform",
  );

  useEffect(() => {
    localStorage.setItem("askai-provider", provider);
  }, [provider]);

  // 用户是否已配置自定义 API（BYOK）：挂载时探测一次，401（匿名）/网络异常静默为 false。
  // 若探测结果为 false 而本地仍选中 byok（配置可能在另一标签页被删），静默回退 platform
  const [byokAvailable, setByokAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/chat/byok`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return; // 401 匿名等：保持不可用
        const data: { configured?: boolean } | null = await res
          .json()
          .catch(() => null);
        if (cancelled) return;
        const configured = data?.configured === true;
        setByokAvailable(configured);
        if (!configured) {
          setProvider((p) => (p === "byok" ? "platform" : p));
        }
      })
      .catch(() => {}); // 网络异常静默：视为不可用
    return () => {
      cancelled = true;
    };
  }, []);

  // 用 ref 保存最新会话 id / 消息，规避闭包陷阱
  const convoIdRef = useRef<string | undefined>(conversationId);
  const messagesRef = useRef<Message[]>(initialMessages);
  messagesRef.current = messages;
  const abortRef = useRef<AbortController | null>(null);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value),
    [],
  );

  // 核心：只把本轮新消息发给后端（历史由服务端按 conversationId 从 DB 读取拼装），
  // 读流，边收边更新最后一条 assistant 消息
  const runChat = useCallback(
    async (userMsg: Message) => {
      setIsGenerating(true);
      // 新一轮开始：清掉上一轮的追问，避免旧建议残留
      setSuggestions([]);

      const controller = new AbortController();
      abortRef.current = controller;

      // 不立即插入 assistant 气泡：在收到首个 delta 前，最后一条仍是 user，
      // MessageList 据此显示「三点跳动」加载动画。首个 delta 到达时才插入气泡。
      const assistantId = newId();
      let assistantInserted = false;

      try {
        const res = await fetch(`${API_BASE}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: controller.signal,
          body: JSON.stringify({
            conversationId: convoIdRef.current,
            message: { content: userMsg.content },
            deepThinking,
            useByok: provider === "byok",
          }),
        });

        // 429 当日配额超限：不打 toast、不闪三点动画。原地追加限额标记气泡（不落库），
        // 并写入当日 localStorage 锁——今天内后续提交在 handleSubmit/append 直接短路，不再发请求
        if (res.status === 429) {
          if (typeof window !== "undefined") {
            localStorage.setItem(QUOTA_LATCH_KEY, todayKey());
          }
          setMessages((prev) => [...prev, limitedMarkerMsg()]);
          setIsGenerating(false);
          return;
        }

        if (!res.ok || !res.body) {
          // 401 保留专属提示；其余状态后端把用户可读文案放在
          // JSON error 字段，优先透传，拿不到再退回通用文案
          let msg = "请求失败，请重试";
          if (res.status === 401) {
            msg = "请先登录后再使用 AI 对话";
          } else {
            const data: { error?: string } | null = await res
              .json()
              .catch(() => null);
            if (data?.error) msg = data.error;
          }
          onError?.(msg);
          setIsGenerating(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        // 解析 SSE：以 \n\n 分隔事件，data: 前缀承载 JSON
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            // 用户已停止：abort 后仍可能读到缓冲的迟到事件，全部丢弃，
            // 避免追加内容盖掉 stop() 打上的 stopped 标记气泡
            if (controller.signal.aborted) continue;
            const line = part.trim();
            if (!line.startsWith("data:")) continue;
            const json = line.slice(5).trim();
            if (!json) continue;

            let evt: StreamEvent;
            try {
              evt = JSON.parse(json);
            } catch {
              continue;
            }

            if (evt.type === "reasoning") {
              // 思考链先于正文到达：首个 reasoning 就插入气泡（含 reasoning、正文暂空）
              if (!assistantInserted) {
                assistantInserted = true;
                setMessages((prev) => [
                  ...prev,
                  {
                    id: assistantId,
                    role: "assistant",
                    content: "",
                    reasoning: evt.content,
                    createdAt: new Date(),
                  },
                ]);
              } else {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, reasoning: (m.reasoning || "") + evt.content }
                      : m,
                  ),
                );
              }
            } else if (evt.type === "delta") {
              if (!assistantInserted) {
                // 首个 delta：插入 assistant 气泡（此前一直显示三点动画）
                assistantInserted = true;
                setMessages((prev) => [
                  ...prev,
                  {
                    id: assistantId,
                    role: "assistant",
                    content: evt.content,
                    createdAt: new Date(),
                  },
                ]);
              } else {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + evt.content }
                      : m,
                  ),
                );
              }
            } else if (evt.type === "done") {
              // 选了平台额度但配额用尽且有 BYOK 配置时，后端静默回退到自定义 API：
              // 计费来源已切换，发一条非错误提示告知用户
              if (evt.via === "byok" && provider === "platform") {
                onNotice?.("平台额度已用完，本轮起已使用你的自定义 API");
              }
              const isNew = !convoIdRef.current;
              convoIdRef.current = evt.conversationId;
              if (isNew) {
                onConversationCreated?.(evt.conversationId, evt.title);
              }
              onFinish?.(evt.conversationId, evt.title);
            } else if (evt.type === "suggestions") {
              // 追问在 done 之后到达，直接覆盖为本轮最新的一批
              setSuggestions(evt.items);
            } else if (evt.type === "error") {
              onError?.(evt.error);
            }
          }
        }
      } catch (err) {
        // AbortError 是用户主动停止，不算错误
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("[useChat] stream error:", err);
          onError?.("网络异常，请重试");
        }
      } finally {
        setIsGenerating(false);
        abortRef.current = null;
      }
    },
    [onConversationCreated, onFinish, onError, onNotice, deepThinking, provider],
  );

  // 发送输入框内容
  const handleSubmit = useCallback(
    (event?: { preventDefault?: () => void }) => {
      event?.preventDefault?.();
      const text = input.trim();
      if (!text || isGenerating) return;

      const userMsg: Message = {
        id: newId(),
        role: "user",
        content: text,
        createdAt: new Date(),
      };
      // 当日限额锁内：用户消息照常保留，原地跟一条限额标记，清空输入框；
      // 不发请求、不置 isGenerating——三点动画整天都不再出现。
      // 锁只对平台额度路径生效：BYOK 不占平台配额，必须照常发请求
      if (provider === "platform" && isQuotaLimitedToday()) {
        setMessages([...messagesRef.current, userMsg, limitedMarkerMsg()]);
        setInput("");
        return;
      }
      const next = [...messagesRef.current, userMsg];
      setMessages(next);
      setInput("");
      void runChat(userMsg);
    },
    [input, isGenerating, runChat, provider],
  );

  // PromptSuggestions 用：直接追加一条用户消息并发送
  const append = useCallback(
    (message: { role: "user"; content: string }) => {
      if (isGenerating) return;
      const userMsg: Message = {
        id: newId(),
        role: "user",
        content: message.content,
        createdAt: new Date(),
      };
      // 同 handleSubmit：当日限额锁内直接短路，只补用户消息 + 限额标记，不发请求；
      // 锁同样只对平台额度路径生效，BYOK 轮次不被拦截
      if (provider === "platform" && isQuotaLimitedToday()) {
        setMessages([...messagesRef.current, userMsg, limitedMarkerMsg()]);
        return;
      }
      const next = [...messagesRef.current, userMsg];
      setMessages(next);
      void runChat(userMsg);
    },
    [isGenerating, runChat, provider],
  );

  const stop = useCallback(() => {
    if (!abortRef.current) return;
    abortRef.current.abort();
    setIsGenerating(false);
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant") {
        return prev.map((m) => (m.id === last.id ? { ...m, stopped: true } : m));
      }
      // 纯思考阶段停止：还没有 assistant 气泡，补一条空的停止态气泡，
      // 既显示「用户停止回答」，也让 isTyping（最后一条是 user）立刻解除
      return [
        ...prev,
        {
          id: newId(),
          role: "assistant",
          content: "",
          stopped: true,
          createdAt: new Date(),
        },
      ];
    });
  }, []);

  // 新对话：把本会话状态整体清回空态。给「新对话」按钮复用当前已挂载的组件用——
  // 新会话首轮是用 replaceState 改的 URL（没走 Next 路由），此时 router.push 回基础路由
  // 会落到同一个已挂载的段上、组件不重挂载，旧消息与 convoId 会残留，故只能手动清。
  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    convoIdRef.current = undefined;
    setMessages([]);
    setInput("");
    setSuggestions([]);
    setIsGenerating(false);
  }, []);

  return {
    messages,
    input,
    isGenerating,
    handleInputChange,
    handleSubmit,
    append,
    stop,
    reset,
    setMessages,
    suggestions,
    deepThinking,
    toggleDeepThinking,
    provider,
    setProvider,
    byokAvailable,
  };
}
