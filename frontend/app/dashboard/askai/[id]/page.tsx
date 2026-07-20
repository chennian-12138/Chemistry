"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Message } from "@/components/ui/chat-message";
import { getConversation, recordHistory } from "@/lib/api";
import { useHistoryStore } from "@/store/history-store";
import AskAi from "@/src/dashboard/AskAi/AskAi";

export default function AskAiConversationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [initialMessages, setInitialMessages] = useState<Message[] | null>(null);
  const [title, setTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    // 切到不同会话时先回到加载态并清空旧消息：AskAi 用 useState 初始化 initialMessages，
    // 同一 [id] 段之间导航不会自动重挂载，不重置会残留上一个会话的消息。
    setLoading(true);
    setNotFound(false);
    setInitialMessages(null);
    const load = async () => {
      try {
        const res = await getConversation(id);
        if (!res.success || !res.data) {
          setNotFound(true);
          return;
        }
        const convo = res.data;
        setTitle(convo.title);

        // 把后端存的 createdAt 字符串转成 Date，符合 kit Message 类型
        const msgs: Message[] = (convo.messages ?? []).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          reasoning: m.reasoning,
          createdAt: m.createdAt ? new Date(m.createdAt) : undefined,
        }));
        setInitialMessages(msgs);

        // 同步侧边栏（置顶此会话），与 reactdic 详情页的写法一致
        recordHistory("AI_CHAT", id, convo.title)
          .then((newRecord) => {
            if (newRecord?.success && newRecord.data) {
              useHistoryStore.getState().addRecord(newRecord.data);
            } else {
              useHistoryStore.getState().addRecord({
                id: `hist-${id}`,
                type: "AI_CHAT",
                targetId: id,
                title: convo.title,
                createdAt: new Date().toISOString(),
              });
            }
          })
          .catch(() => {});
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return null;

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="bg-muted/30 p-8 rounded-full mb-6">
          <MessageSquare className="w-16 h-16 text-muted-foreground opacity-60" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight mb-3">
          对话不存在
        </h2>
        <p className="text-muted-foreground text-lg mb-10 max-w-md">
          该对话记录不存在，或者你没有权限查看。
        </p>
        <Button onClick={() => router.push("/dashboard/askai")} size="lg" className="px-8 shadow-md">
          开始新对话
        </Button>
      </div>
    );
  }

  return (
    <AskAi
      conversationId={id}
      initialMessages={initialMessages ?? []}
      title={title}
    />
  );
}
