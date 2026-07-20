"use client";

import { useCallback, useRef, useState } from "react";
import type { Message } from "@/components/ui/chat-message";

const API_BASE =
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:8000";

// 后端 SSE 事件
type StreamEvent =
  | { type: "reasoning"; content: string }
  | { type: "delta"; content: string }
  | { type: "done"; conversationId: string; messageId: string; title: string }
  | { type: "suggestions"; items: string[] }
  | { type: "error"; error: string };

// 传给后端的精简消息体（不含 Date，避免序列化问题）
interface WireMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  // 回传思考链：仅为续聊时保住历史 reasoning 不被覆盖丢失；后端不会把它发给模型
  reasoning?: string;
  createdAt?: string;
}

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
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function useChat({
  conversationId,
  initialMessages = [],
  onConversationCreated,
  onFinish,
  onError,
}: UseChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  // 后端在每轮结束后经 SSE 回传的动态追问（用户口吻）；发新消息时清空
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // 用 ref 保存最新会话 id / 消息，规避闭包陷阱
  const convoIdRef = useRef<string | undefined>(conversationId);
  const messagesRef = useRef<Message[]>(initialMessages);
  messagesRef.current = messages;
  const abortRef = useRef<AbortController | null>(null);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value),
    [],
  );

  // 核心：把 history 发给后端，读流，边收边更新最后一条 assistant 消息
  const runChat = useCallback(
    async (history: Message[]) => {
      setIsGenerating(true);
      // 新一轮开始：清掉上一轮的追问，避免旧建议残留
      setSuggestions([]);

      const controller = new AbortController();
      abortRef.current = controller;

      // 不立即插入 assistant 气泡：在收到首个 delta 前，最后一条仍是 user，
      // MessageList 据此显示「三点跳动」加载动画。首个 delta 到达时才插入气泡。
      const assistantId = newId();
      let assistantInserted = false;

      const wire: WireMessage[] = history.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        reasoning: m.reasoning,
        createdAt:
          m.createdAt instanceof Date ? m.createdAt.toISOString() : undefined,
      }));

      try {
        const res = await fetch(`${API_BASE}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: controller.signal,
          body: JSON.stringify({
            conversationId: convoIdRef.current,
            messages: wire,
          }),
        });

        if (!res.ok || !res.body) {
          const msg =
            res.status === 401 ? "请先登录后再使用 AI 对话" : "请求失败，请重试";
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
    [onConversationCreated, onFinish, onError],
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
      const next = [...messagesRef.current, userMsg];
      setMessages(next);
      setInput("");
      void runChat(next);
    },
    [input, isGenerating, runChat],
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
      const next = [...messagesRef.current, userMsg];
      setMessages(next);
      void runChat(next);
    },
    [isGenerating, runChat],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsGenerating(false);
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
  };
}
