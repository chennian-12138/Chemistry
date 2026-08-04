"use client"

import React, { useEffect, useMemo, useState } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"
import { Ban, Brain, CalendarClock, ChevronRight, Code2, Loader2, Terminal } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { FilePreview } from "@/components/ui/file-preview"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"

const chatBubbleVariants = cva(
  "group/message relative break-words rounded-lg p-3 text-sm",  {
    variants: {
      isUser: {
        true: "bg-primary text-primary-foreground",
        false: "bg-muted text-foreground",
      },
      animation: {
        none: "",
        slide: "duration-300 animate-in fade-in-0",
        scale: "duration-300 animate-in fade-in-0 zoom-in-75",
        fade: "duration-500 animate-in fade-in-0",
      },
    },
    compoundVariants: [
      {
        isUser: true,
        animation: "slide",
        class: "slide-in-from-right",
      },
      {
        isUser: false,
        animation: "slide",
        class: "slide-in-from-left",
      },
      {
        isUser: true,
        animation: "scale",
        class: "origin-bottom-right",
      },
      {
        isUser: false,
        animation: "scale",
        class: "origin-bottom-left",
      },
    ],
  }
)

type Animation = VariantProps<typeof chatBubbleVariants>["animation"]

interface Attachment {
  name?: string
  contentType?: string
  url: string
}

interface PartialToolCall {
  state: "partial-call"
  toolName: string
}

interface ToolCall {
  state: "call"
  toolName: string
}

interface ToolResult {
  state: "result"
  toolName: string
  result: {
    __cancelled?: boolean
    [key: string]: any
  }
}

type ToolInvocation = PartialToolCall | ToolCall | ToolResult

interface ReasoningPart {
  type: "reasoning"
  reasoning: string
}

interface ToolInvocationPart {
  type: "tool-invocation"
  toolInvocation: ToolInvocation
}

interface TextPart {
  type: "text"
  text: string
}

// For compatibility with AI SDK types, not used
interface SourcePart {
  type: "source"
  source?: any
}

interface FilePart {
  type: "file"
  mimeType: string
  data: string
}

interface StepStartPart {
  type: "step-start"
}

type MessagePart =
  | TextPart
  | ReasoningPart
  | ToolInvocationPart
  | SourcePart
  | FilePart
  | StepStartPart

export interface Message {
  id: string
  role: "user" | "assistant" | (string & {})
  content: string
  /** 思考链（仅 assistant）：非空时在气泡上方渲染可折叠的「思考」块 */
  reasoning?: string
  /** 用户主动停止（仅 assistant，会话内展示用，不落库）：渲染「用户停止回答」且不再转圈 */
  stopped?: boolean
  /** 当日限额态，仅会话内展示不落库（仅 assistant）：渲染「明天再来看看吧」与配置入口链接 */
  limited?: boolean
  createdAt?: Date
  experimental_attachments?: Attachment[]
  toolInvocations?: ToolInvocation[]
  parts?: MessagePart[]
}

export interface ChatMessageProps extends Message {
  showTimeStamp?: boolean
  animation?: Animation
  actions?: React.ReactNode
  /** 可选头像节点（渲染在气泡一侧）：user 在右，assistant 在左 */
  avatar?: React.ReactNode
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  role,
  content,
  reasoning,
  stopped,
  limited,
  createdAt,
  showTimeStamp = false,
  animation = "scale",
  actions,
  avatar,
  experimental_attachments,
  toolInvocations,
  parts,
}) => {
  const files = useMemo(() => {
    return experimental_attachments?.map((attachment) => {
      const dataArray = dataUrlToUint8Array(attachment.url)
      const file = new File([dataArray], attachment.name ?? "Unknown", {
        type: attachment.contentType,
      })
      return file
    })
  }, [experimental_attachments])

  const isUser = role === "user"

  const formattedTime = createdAt?.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })

  if (isUser) {
    return (
      <div className="flex flex-row-reverse gap-3">
        {avatar ? <div className="shrink-0 pt-0.5">{avatar}</div> : null}
        <div className="flex flex-col items-end max-w-[70%]">
          {files ? (
            <div className="mb-1 flex flex-wrap gap-2">
              {files.map((file, index) => {
                return <FilePreview file={file} key={index} />
              })}
            </div>
          ) : null}

          <div className={cn(chatBubbleVariants({ isUser, animation }))}>
            <MarkdownRenderer>{content}</MarkdownRenderer>
          </div>

          {actions ? <div className="mt-1">{actions}</div> : null}

          {showTimeStamp && createdAt ? (
            <time
              dateTime={createdAt.toISOString()}
              className={cn(
                "mt-1 block px-1 text-xs opacity-50",
                animation !== "none" && "duration-500 animate-in fade-in-0"
              )}
            >
              {formattedTime}
            </time>
          ) : null}
        </div>
      </div>
    )
  }

  if (parts && parts.length > 0) {
    return parts.map((part, index) => {
      if (part.type === "text") {
        return (
          <div
            className={cn(
              "flex flex-col max-w-[70%]",
              isUser ? "items-end" : "items-start"
            )}
            key={`text-${index}`}
          >
            <div className={cn(chatBubbleVariants({ isUser, animation }))}>
              <MarkdownRenderer>{part.text}</MarkdownRenderer>
            </div>

            {actions ? <div className="mt-1">{actions}</div> : null}

            {showTimeStamp && createdAt ? (
              <time
                dateTime={createdAt.toISOString()}
                className={cn(
                  "mt-1 block px-1 text-xs opacity-50",
                  animation !== "none" && "duration-500 animate-in fade-in-0"
                )}
              >
                {formattedTime}
              </time>
            ) : null}
          </div>
        )
      } else if (part.type === "reasoning") {
        return <ReasoningBlock key={`reasoning-${index}`} part={part} />
      } else if (part.type === "tool-invocation") {
        return (
          <ToolCall
            key={`tool-${index}`}
            toolInvocations={[part.toolInvocation]}
          />
        )
      }
      return null
    })
  }

  if (toolInvocations && toolInvocations.length > 0) {
    return <ToolCall toolInvocations={toolInvocations} />
  }

  return (
    <div className="flex flex-row gap-3">
      {avatar ? <div className="shrink-0 pt-0.5">{avatar}</div> : null}
      <div className="flex w-full flex-col items-start max-w-[70%]">
        {reasoning ? (
          <ThinkingBlock
            reasoning={reasoning}
            isThinking={!content && !stopped}
            stopped={stopped && !content}
          />
        ) : null}

        {content ? (
          <div className={cn(chatBubbleVariants({ isUser, animation }))}>
            <MarkdownRenderer>{content}</MarkdownRenderer>
          </div>
        ) : null}

        {/* 停止标记：有部分正文时跟在气泡下方；正文与思考链都没有时作为整条消息主体。
            「有思考链但无正文」由 ThinkingBlock 的停止态标题承担，这里不重复渲染 */}
        {stopped && (content || !reasoning) ? (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Ban className="h-3 w-3" />
            <span>用户停止回答</span>
          </div>
        ) : null}

        {/* 限额标记：与停止标记同位置同样式；下方跟一行设置页入口，引导配置自己的 API */}
        {limited ? (
          <div className="mt-1 flex flex-col items-start gap-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="h-3 w-3" />
              <span>明天再来看看吧</span>
            </div>
            <Link
              href="/dashboard/settings"
              className="text-xs text-muted-foreground/80 underline-offset-2 hover:text-foreground hover:underline"
            >
              配置自己的 API 继续使用 →
            </Link>
          </div>
        ) : null}

        {actions && content ? <div className="mt-1">{actions}</div> : null}

        {showTimeStamp && createdAt ? (
          <time
            dateTime={createdAt.toISOString()}
            className={cn(
              "mt-1 block px-1 text-xs opacity-50",
              animation !== "none" && "duration-500 animate-in fade-in-0"
            )}
          >
            {formattedTime}
          </time>
        ) : null}
      </div>
    </div>
  )
}

function dataUrlToUint8Array(data: string) {
  const base64 = data.split(",")[1]
  const buf = Buffer.from(base64, "base64")
  return new Uint8Array(buf)
}

const ReasoningBlock = ({ part }: { part: ReasoningPart }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="mb-2 flex flex-col items-start sm:max-w-[70%]">
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="group w-full overflow-hidden rounded-lg border bg-muted/50"
      >
        <div className="flex items-center p-2">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
              <span>Thinking</span>
            </button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent forceMount>
          <motion.div
            initial={false}
            animate={isOpen ? "open" : "closed"}
            variants={{
              open: { height: "auto", opacity: 1 },
              closed: { height: 0, opacity: 0 },
            }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="border-t"
          >
            <div className="p-2">
              <div className="whitespace-pre-wrap text-xs">
                {part.reasoning}
              </div>
            </div>
          </motion.div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

/**
 * 思考链折叠块（DeepSeek reasoning_content 用）：
 * 思考中自动展开、标题显示「思考中…」带转圈；正文开始后自动折叠成「已深度思考」，
 * 用户可随时手动展开/收起。思考阶段被用户停止时（stopped）标题变为「用户停止回答」，
 * 不转圈、默认收起（停止视同思考结束）。
 */
const ThinkingBlock = ({
  reasoning,
  isThinking,
  stopped = false,
}: {
  reasoning: string
  isThinking: boolean
  stopped?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(isThinking)

  // 思考态切换时同步：进入思考→展开；思考结束→自动收起（此后用户可再手动开）。
  // stopped 视同思考结束：调用方在 stopped 时必传 isThinking=false，故此处无需再判
  useEffect(() => {
    setIsOpen(isThinking)
  }, [isThinking])

  return (
    <div className="mb-2 flex w-full flex-col items-start">
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="group w-full overflow-hidden rounded-lg border bg-muted/50"
      >
        <div className="flex items-center p-2">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
              {stopped ? (
                <>
                  <Ban className="h-3.5 w-3.5" />
                  <span>用户停止回答</span>
                </>
              ) : isThinking ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>思考中…</span>
                </>
              ) : (
                <>
                  <Brain className="h-3.5 w-3.5" />
                  <span>已深度思考</span>
                </>
              )}
            </button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent forceMount>
          <motion.div
            initial={false}
            animate={isOpen ? "open" : "closed"}
            variants={{
              open: { height: "auto", opacity: 1 },
              closed: { height: 0, opacity: 0 },
            }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="border-t"
          >
            <div className="p-2">
              <div className="whitespace-pre-wrap text-xs text-muted-foreground">
                {reasoning}
              </div>
            </div>
          </motion.div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

function ToolCall({
  toolInvocations,
}: Pick<ChatMessageProps, "toolInvocations">) {
  if (!toolInvocations?.length) return null

  return (
    <div className="flex flex-col items-start gap-2">
      {toolInvocations.map((invocation, index) => {
        const isCancelled =
          invocation.state === "result" &&
          invocation.result.__cancelled === true

        if (isCancelled) {
          return (
            <div
              key={index}
              className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
            >
              <Ban className="h-4 w-4" />
              <span>
                Cancelled{" "}
                <span className="font-mono">
                  {"`"}
                  {invocation.toolName}
                  {"`"}
                </span>
              </span>
            </div>
          )
        }

        switch (invocation.state) {
          case "partial-call":
          case "call":
            return (
              <div
                key={index}
                className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
              >
                <Terminal className="h-4 w-4" />
                <span>
                  Calling{" "}
                  <span className="font-mono">
                    {"`"}
                    {invocation.toolName}
                    {"`"}
                  </span>
                  ...
                </span>
                <Loader2 className="h-3 w-3 animate-spin" />
              </div>
            )
          case "result":
            return (
              <div
                key={index}
                className="flex flex-col gap-1.5 rounded-lg border bg-muted/50 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Code2 className="h-4 w-4" />
                  <span>
                    Result from{" "}
                    <span className="font-mono">
                      {"`"}
                      {invocation.toolName}
                      {"`"}
                    </span>
                  </span>
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap text-foreground">
                  {JSON.stringify(invocation.result, null, 2)}
                </pre>
              </div>
            )
          default:
            return null
        }
      })}
    </div>
  )
}
