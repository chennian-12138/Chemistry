"use client";

import { useCallback } from "react";

import {
  ChatContainer,
  ChatForm,
  ChatMessages,
} from "@/components/ui/chat";
import { ChatMessage, type Message } from "@/components/ui/chat-message";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CopyButton } from "@/components/ui/copy-button";
import { MessageInput } from "@/components/ui/message-input";
import { MessageList } from "@/components/ui/message-list";
import { PromptSuggestions } from "@/components/ui/prompt-suggestions";

// AI 头像：Next 把 app/favicon.ico 映射到根路径
const AI_AVATAR = "/favicon.ico";

// 空会话问候语（纯展示：不进 messages、不发后端、不落库）
const GREETING = "你好！我是你的 AI 化学助手，今天你有什么想问的？";

interface AskAiChatProps {
  messages: Message[];
  input: string;
  isGenerating: boolean;
  handleInputChange: React.ChangeEventHandler<HTMLTextAreaElement>;
  handleSubmit: (event?: { preventDefault?: () => void }) => void;
  append: (message: { role: "user"; content: string }) => void;
  stop: () => void;
  // 空会话时展示的冷启动引导问题（随机抽样）
  coldStartSuggestions?: string[];
  // 对话进行中、由后端按上下文生成的动态追问
  dynamicSuggestions?: string[];
  className?: string;
  userImage?: string;
  userName?: string;
}

/**
 * 精简版聊天界面：基于 blazity-shadcn-chatbot-kit 的容器组合而成，
 * 相比 kit 自带的 <Chat> 关掉了附件上传与语音输入（不传 allowAttachments / transcribeAudio）。
 * Markdown 渲染由 kit 的 ChatMessage → MarkdownRenderer 自动完成。
 */
export function AskAiChat({
  messages,
  input,
  isGenerating,
  handleInputChange,
  handleSubmit,
  append,
  stop,
  coldStartSuggestions = [],
  dynamicSuggestions = [],
  className,
  userImage = "",
  userName = "",
}: AskAiChatProps) {
  const lastMessage = messages.at(-1);
  const isTyping = lastMessage?.role === "user";

  const userInitial = (userName.trim()[0] || "我").toUpperCase();

  // 建议条显示策略（对齐主流做法）：
  // - 空会话：展示冷启动池随机抽的问题，标签「猜你想问」
  // - 对话中且已拿到本轮追问、且未在生成：展示动态追问，标签「继续追问」
  // - 生成中 / 无追问：不展示
  const isEmpty = messages.length === 0;
  const activeSuggestions = isEmpty
    ? coldStartSuggestions
    : !isGenerating && !isTyping
      ? dynamicSuggestions
      : [];
  const suggestionLabel = isEmpty ? "猜你想问" : "继续追问";

  // 每条消息：左/右头像 + 尾部复制按钮（无附件/语音，保持克制）
  const messageOptions = useCallback(
    (message: Message) => ({
      avatar:
        message.role === "user" ? (
          <Avatar className="size-8">
            <AvatarImage src={userImage} alt={userName} />
            <AvatarFallback>{userInitial}</AvatarFallback>
          </Avatar>
        ) : (
          <Avatar className="size-8">
            <AvatarImage src={AI_AVATAR} alt="AI" />
            <AvatarFallback>AI</AvatarFallback>
          </Avatar>
        ),
      actions: (
        <CopyButton
          content={message.content}
          copyMessage="已复制到剪贴板"
        />
      ),
    }),
    [userImage, userName, userInitial],
  );

  return (
    <ChatContainer className={className}>
      <ChatMessages messages={messages}>
        {messages.length > 0 ? (
          <MessageList
            messages={messages}
            isTyping={isTyping}
            messageOptions={messageOptions}
          />
        ) : (
          // 空会话：展示一条 AI 问候气泡（与真实消息同款样式，但不写入 messages）
          <ChatMessage
            id="greeting"
            role="assistant"
            content={GREETING}
            avatar={
              <Avatar className="size-8">
                <AvatarImage src={AI_AVATAR} alt="AI" />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
            }
          />
        )}
      </ChatMessages>

      <div>
        {activeSuggestions.length > 0 ? (
          <div className="mb-2">
            <PromptSuggestions
              label={suggestionLabel}
              append={append}
              suggestions={activeSuggestions}
            />
          </div>
        ) : null}
        <ChatForm
          className="mt-auto"
          isPending={isGenerating || isTyping}
          handleSubmit={handleSubmit}
        >
          {() => (
            <MessageInput
              value={input}
              onChange={handleInputChange}
              placeholder="输入你的化学问题…"
              allowAttachments={false}
              stop={stop}
              isGenerating={isGenerating}
            />
          )}
        </ChatForm>
      </div>
    </ChatContainer>
  );
}
