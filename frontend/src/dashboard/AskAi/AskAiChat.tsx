"use client";

import { useCallback, useEffect, useRef } from "react";
import { motion, useReducedMotion, type Transition } from "framer-motion";
import { Brain, KeyRound, Sparkles } from "lucide-react";

import {
  ChatContainer,
  ChatForm,
  ChatMessages,
} from "@/components/ui/chat";
import { type Message } from "@/components/ui/chat-message";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CopyButton } from "@/components/ui/copy-button";
import { MessageInput } from "@/components/ui/message-input";
import { MessageList } from "@/components/ui/message-list";
import { PromptSuggestions } from "@/components/ui/prompt-suggestions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type ChatProvider } from "@/hooks/use-chat";
import { cn } from "@/lib/utils";

// AI 头像：Next 把 app/favicon.ico 映射到根路径
const AI_AVATAR = "/favicon.ico";

// 空会话 hero 文案（纯展示：不进 messages、不发后端、不落库）
const GREETING_HEADING = "你好！我是你的 AI 化学助手";
const GREETING_SUBHEADING = "今天有什么想问的？";

// hero 与停靠布局共享同一个输入框：layoutId 相同，framer-motion 在切换时做 FLIP 位移动画，
// 用户能感知输入框从中央「移动」到底部，而不是硬切（对齐 ChatGPT/Claude 的主流空会话范式）
const INPUT_LAYOUT_ID = "askai-input-dock";
// MessageInput 会把额外 props 透传到内部 textarea 上，用 id 作为恢复焦点的锚点（侵入最小）
const ASKAI_INPUT_ID = "askai-message-input";

// 位移动画保持利落：~400ms 的弹簧，不做慢速电影感动效
const INPUT_SPRING: Transition = { type: "spring", stiffness: 260, damping: 30 };

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
  // 深度思考开关：传入 onToggleDeepThinking 时在建议条行尾渲染切换 pill
  deepThinking?: boolean;
  onToggleDeepThinking?: () => void;
  // API 来源：byokAvailable 为 true 时在深度思考 pill 左侧渲染来源选择器
  provider?: ChatProvider;
  onProviderChange?: (provider: ChatProvider) => void;
  byokAvailable?: boolean;
  className?: string;
  userImage?: string;
  userName?: string;
}

interface ChatInputDockProps {
  input: string;
  isGenerating: boolean;
  isTyping: boolean;
  handleInputChange: React.ChangeEventHandler<HTMLTextAreaElement>;
  handleSubmit: (event?: { preventDefault?: () => void }) => void;
  stop: () => void;
  reduceMotion: boolean;
}

/**
 * 输入区（建议条之外的 ChatForm + MessageInput），在 hero 与底部停靠两处复用同一份配置，
 * 保证两种布局下 MessageInput 的行为/属性完全一致；外层 motion.div 带共享 layoutId 驱动位移。
 */
function ChatInputDock({
  input,
  isGenerating,
  isTyping,
  handleInputChange,
  handleSubmit,
  stop,
  reduceMotion,
}: ChatInputDockProps) {
  return (
    <motion.div
      layoutId={INPUT_LAYOUT_ID}
      transition={reduceMotion ? { duration: 0 } : INPUT_SPRING}
    >
      <ChatForm
        className="mt-auto"
        isPending={isGenerating || isTyping}
        handleSubmit={handleSubmit}
      >
        {() => (
          <MessageInput
            id={ASKAI_INPUT_ID}
            value={input}
            onChange={handleInputChange}
            placeholder="输入你的化学问题…"
            allowAttachments={false}
            stop={stop}
            isGenerating={isGenerating}
          />
        )}
      </ChatForm>
    </motion.div>
  );
}

interface DeepThinkingToggleProps {
  deepThinking?: boolean;
  onToggle: () => void;
}

/**
 * 深度思考切换 pill：样式沿用原输入框下方独立行版本，现固定在建议条行尾（见 SuggestionsRow），
 * shrink-0 保证自身不被挤压换行
 */
function DeepThinkingToggle({ deepThinking, onToggle }: DeepThinkingToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={deepThinking}
      onClick={onToggle}
      title="开启后模型先输出思考链，回答更深入，但更慢、更费 token"
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
        deepThinking
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Brain className="h-3.5 w-3.5" />
      深度思考
    </button>
  );
}

interface ProviderSelectProps {
  provider: ChatProvider;
  onProviderChange: (provider: ChatProvider) => void;
}

/**
 * API 来源选择器：平台额度 / 自定义 API。触发器做成 ghost 无边框样式，
 * 与右侧深度思考 pill 同一视觉量级（text-xs、h-7、rounded-full）
 */
function ProviderSelect({ provider, onProviderChange }: ProviderSelectProps) {
  return (
    <Select
      value={provider}
      onValueChange={(v) => onProviderChange(v as ChatProvider)}
    >
      <SelectTrigger
        aria-label="API 来源"
        className="shrink-0 gap-1.5 rounded-full border-transparent bg-transparent px-2.5 py-1 text-xs text-muted-foreground shadow-none hover:bg-muted hover:text-foreground focus-visible:border-transparent focus-visible:ring-1 data-[size=default]:h-7 dark:bg-transparent dark:hover:bg-muted"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="end" className="min-w-32">
        <SelectItem value="platform" className="text-xs">
          <Sparkles className="size-3.5" />
          平台额度
        </SelectItem>
        <SelectItem value="byok" className="text-xs">
          <KeyRound className="size-3.5" />
          自定义 API
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

interface SuggestionsRowProps {
  label: string;
  append: (message: { role: "user"; content: string }) => void;
  suggestions: string[];
  deepThinking?: boolean;
  onToggleDeepThinking?: () => void;
  provider?: ChatProvider;
  onProviderChange?: (provider: ChatProvider) => void;
  byokAvailable?: boolean;
}

/**
 * 建议条行：左侧建议区（猜你想问/继续追问）可换行、占满剩余宽度，深度思考切换固定在行尾，
 * 两者同一水平行——省掉原先输入框下方的独立开关行。hero 与停靠两种布局共用同一结构，
 * 显示时机沿用建议条既有策略（生成中/无追问时整行不展示，切换键也随之不出现）。
 * 已配置自定义 API（byokAvailable）时，深度思考左侧再渲染 API 来源选择器。
 */
function SuggestionsRow({
  label,
  append,
  suggestions,
  deepThinking,
  onToggleDeepThinking,
  provider,
  onProviderChange,
  byokAvailable,
}: SuggestionsRowProps) {
  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <PromptSuggestions
          label={label}
          append={append}
          suggestions={suggestions}
        />
      </div>
      {byokAvailable && provider && onProviderChange ? (
        <ProviderSelect provider={provider} onProviderChange={onProviderChange} />
      ) : null}
      {onToggleDeepThinking ? (
        <DeepThinkingToggle
          deepThinking={deepThinking}
          onToggle={onToggleDeepThinking}
        />
      ) : null}
    </div>
  );
}

/**
 * 精简版聊天界面：基于 blazity-shadcn-chatbot-kit 的容器组合而成，
 * 相比 kit 自带的 <Chat> 关掉了附件上传与语音输入（不传 allowAttachments / transcribeAudio）。
 * Markdown 渲染由 kit 的 ChatMessage → MarkdownRenderer 自动完成。
 *
 * 空会话时渲染居中 hero（问候语 + 输入框 + 冷启动建议）；首条消息发出后
 * 切换为「消息列表 + 底部停靠输入」的对话布局，输入框随 layoutId 动画移动到底部。
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
  deepThinking,
  onToggleDeepThinking,
  provider,
  onProviderChange,
  byokAvailable,
  className,
  userImage = "",
  userName = "",
}: AskAiChatProps) {
  const lastMessage = messages.at(-1);
  const isTyping = lastMessage?.role === "user";
  const reduceMotion = useReducedMotion();

  const userInitial = (userName.trim()[0] || "我").toUpperCase();

  // 建议条显示策略（对齐主流做法）：
  // - 空会话：展示冷启动池随机抽的问题，标签「猜你想问」，置于 hero 输入框下方
  // - 对话中且已拿到本轮追问、且未在生成：展示动态追问，标签「继续追问」，置于停靠输入框上方
  // - 生成中 / 无追问：不展示
  const isEmpty = messages.length === 0;
  const activeSuggestions = isEmpty
    ? coldStartSuggestions
    : !isGenerating && !isTyping
      ? dynamicSuggestions
      : [];
  const suggestionLabel = isEmpty ? "猜你想问" : "继续追问";

  // 首条消息发出后输入框从 hero 迁移到底部：React 会把 textarea 卸载重挂、焦点丢失，
  // 这里在 messages 从空翻转为非空时把焦点还给停靠输入框
  const wasEmptyRef = useRef(isEmpty);
  useEffect(() => {
    if (wasEmptyRef.current && !isEmpty) {
      document
        .getElementById(ASKAI_INPUT_ID)
        ?.focus({ preventScroll: true });
    }
    wasEmptyRef.current = isEmpty;
  }, [isEmpty]);

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

  const inputDock = (
    <ChatInputDock
      input={input}
      isGenerating={isGenerating}
      isTyping={isTyping}
      handleInputChange={handleInputChange}
      handleSubmit={handleSubmit}
      stop={stop}
      reduceMotion={reduceMotion ?? false}
    />
  );

  if (isEmpty) {
    // 空会话 hero：纵向跨满容器两行，内容块中心约在 44% 高度（略高于几何中心，观感更稳）
    return (
      <ChatContainer className={className}>
        <div className="row-span-2 flex min-h-0 flex-col items-center justify-center overflow-y-auto pb-[12vh]">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex w-full max-w-2xl flex-col gap-6"
          >
            <header className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">
                {GREETING_HEADING}
              </h1>
              <p className="text-sm text-muted-foreground sm:text-base">
                {GREETING_SUBHEADING}
              </p>
            </header>
            {inputDock}
            {activeSuggestions.length > 0 ? (
              <SuggestionsRow
                label={suggestionLabel}
                append={append}
                suggestions={activeSuggestions}
                deepThinking={deepThinking}
                onToggleDeepThinking={onToggleDeepThinking}
                provider={provider}
                onProviderChange={onProviderChange}
                byokAvailable={byokAvailable}
              />
            ) : null}
          </motion.div>
        </div>
      </ChatContainer>
    );
  }

  return (
    <ChatContainer className={className}>
      <ChatMessages messages={messages}>
        {/* 首轮切换时消息列表淡入，配合输入框下移动画，避免布局硬切 */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
          <MessageList
            messages={messages}
            isTyping={isTyping}
            messageOptions={messageOptions}
          />
        </motion.div>
      </ChatMessages>

      <div>
        {activeSuggestions.length > 0 ? (
          <div className="mb-2">
            <SuggestionsRow
              label={suggestionLabel}
              append={append}
              suggestions={activeSuggestions}
              deepThinking={deepThinking}
              onToggleDeepThinking={onToggleDeepThinking}
              provider={provider}
              onProviderChange={onProviderChange}
              byokAvailable={byokAvailable}
            />
          </div>
        ) : null}
        {inputDock}
      </div>
    </ChatContainer>
  );
}
