"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Bot, Plus } from "lucide-react";

import { AskAiChat } from "./AskAiChat";
import { type Message } from "@/components/ui/chat-message";
import { Button } from "@/components/ui/button";
import { useChat } from "@/hooks/use-chat";
import { useSession } from "@/lib/auth-client";
import { useHistoryStore } from "@/store/history-store";

// 冷启动引导问题池（空会话时随机抽 3 条展示，刷新即换一批）。
// 主流做法：空对话无上下文可依据，冷启动不实时调 LLM，用人工问题池随机抽样。
const COLD_START_POOL = [
  "什么是 SN2 反应的立体化学特征？",
  "帮我分析阿司匹林的逆合成路线",
  "解释一下 Diels-Alder 反应的机理",
  "苯环的亲电取代定位规律是什么？",
  "如何用 NMR 区分邻位和对位取代？",
  "格氏试剂为什么必须无水操作？",
  "讲讲 E1 和 E2 消除的区别",
  "手性中心的 R/S 构型怎么判断？",
  "羰基的亲核加成有哪些常见类型？",
  "什么是芳香性的休克尔规则？",
  "帮我设计布洛芬的合成路线",
  "解释一下 SN1 反应中的碳正离子重排",
  "如何解析一张红外光谱图？",
  "催化氢化的立体选择性由什么决定？",
  "对映体和非对映体有什么区别？",
];

// 从池中随机抽 n 条（Fisher-Yates 洗牌前 n 个）
function sampleSuggestions(pool: string[], n: number): string[] {
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

interface AskAiProps {
  // 续聊时传入会话 id 与历史消息；新会话都为空
  conversationId?: string;
  initialMessages?: Message[];
  // 续聊页传入会话标题；新会话页不传，顶部显示默认标题
  title?: string;
}

export default function AskAi({
  conversationId,
  initialMessages,
  title,
}: AskAiProps) {
  const { data: session } = useSession();
  // 记录当前会话 id（新会话创建后回填），仅用于本组件内的历史同步判断
  const [, setActiveId] = useState<string | undefined>(conversationId);
  // 顶部标题：新会话初始为空（显示默认名），首轮落库拿到标题后回填
  const [displayTitle, setDisplayTitle] = useState<string>(title || "");
  // 冷启动建议：挂载时抽一次并固定（用 initializer，避免每次渲染重抽导致闪动）
  const [coldStart] = useState<string[]>(() => sampleSuggestions(COLD_START_POOL, 3));

  // 新会话首次落库：更新 URL（不重挂载）+ 同步侧边栏历史
  const handleConversationCreated = useCallback(
    (id: string, title: string) => {
      setActiveId(id);
      // 用 replaceState 而非 router.replace，避免组件卸载丢失当前流式消息
      window.history.replaceState(null, "", `/dashboard/askai/${id}`);
      useHistoryStore.getState().addRecord({
        id: `hist-${id}`,
        type: "AI_CHAT",
        targetId: id,
        title,
        createdAt: new Date().toISOString(),
      });
    },
    [],
  );

  // 每轮完成：回填顶部标题 + 把该会话在侧边栏置顶（addRecord 会去重并前置）
  const handleFinish = useCallback((id: string, title: string) => {
    setDisplayTitle(title);
    useHistoryStore.getState().addRecord({
      id: `hist-${id}`,
      type: "AI_CHAT",
      targetId: id,
      title,
      createdAt: new Date().toISOString(),
    });
  }, []);

  const handleError = useCallback((message: string) => {
    toast.error(message);
  }, []);

  const chat = useChat({
    conversationId,
    initialMessages,
    onConversationCreated: handleConversationCreated,
    onFinish: handleFinish,
    onError: handleError,
  });

  // 「新对话」：不能靠 router.push 重挂载组件来清状态。新会话是用 replaceState 改的 URL、
  // 没走 Next 路由，当前挂载的仍是基础路由段，push 回基础路由会落到同一个已挂载段上、
  // 不重挂载，旧消息与 convoId 会残留。真实 /askai/[id] 页同理（该段不会因 push 到别的
  // 路径而重置自身 state）。故统一走本地清空 + replaceState 复位 URL，确定可靠。
  const handleNewChat = useCallback(() => {
    chat.reset();
    setActiveId(undefined);
    setDisplayTitle("");
    window.history.replaceState(null, "", "/dashboard/askai");
  }, [chat]);

  return (
    <div className="mx-auto flex h-[calc(100svh-4rem)] md:h-[calc(100svh-5rem)] w-full max-w-7xl flex-col px-4 md:px-6 pb-4 bg-transparent">
      {/* 顶部标题栏 */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-2 bg-transparent"
      >
        <Bot className="size-5 text-primary shrink-0" />
        <h1 className="text-xl font-semibold truncate">{displayTitle || "问问 AI"}</h1>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto shrink-0"
          onClick={handleNewChat}
        >
          <Plus className="size-4" />
          新对话
        </Button>
      </motion.div>

      <AskAiChat
        className="h-full w-full min-h-0 flex-1"
        messages={chat.messages}
        input={chat.input}
        isGenerating={chat.isGenerating}
        handleInputChange={chat.handleInputChange}
        handleSubmit={chat.handleSubmit}
        append={chat.append}
        stop={chat.stop}
        coldStartSuggestions={coldStart}
        dynamicSuggestions={chat.suggestions}
        userImage={session?.user?.image || ""}
        userName={session?.user?.name || ""}
      />
    </div>
  );
}
