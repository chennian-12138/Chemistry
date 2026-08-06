"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createFeedbackPost,
  type FeedbackPostType,
} from "@/lib/api";
import { useSession } from "@/lib/auth-client";

import { FEEDBACK_TYPE_LABELS } from "../shared";

export default function NewFeedbackPostPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const user = session?.user as unknown as { role?: string } | undefined;
  const role = user?.role?.toLowerCase();
  const isAdmin = role === "admin" || role === "superadmin";

  const [title, setTitle] = useState("");
  const [type, setType] = useState<FeedbackPostType | "">("");
  const [content, setContent] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    title.trim().length > 0 &&
    content.trim().length > 0 &&
    (isAnnouncement || type !== "") &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await createFeedbackPost({
        title: title.trim(),
        type: isAnnouncement ? "other" : (type as FeedbackPostType),
        content: content.trim(),
        isPrivate: isAnnouncement ? false : isPrivate,
        isAnnouncement,
      });
      router.push(`/dashboard/feedback?post=${res.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "发布失败，请稍后重试");
      setSubmitting(false);
    }
  };

  return (
    <main className="w-full px-6 py-16 md:px-10 md:py-20">
      <section className="mb-10">
        <Link
          href="/dashboard/feedback"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          返回反馈列表
        </Link>
        <h1 className="mb-4 text-3xl font-medium tracking-tight text-foreground md:text-4xl">
          发布新帖
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
          描述你遇到的问题、建议或功能需求，我们会尽快查看并回复。
        </p>
      </section>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="flex flex-col gap-2">
          <label htmlFor="title" className="text-sm font-medium text-foreground">
            标题
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              *
            </span>
          </label>
          <Input
            id="title"
            required
            maxLength={100}
            placeholder="一句话概括你的问题或建议"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {!isAnnouncement && (
          <div className="flex flex-col gap-2">
            <label htmlFor="type" className="text-sm font-medium text-foreground">
              类型
              <span className="ml-0.5 text-destructive" aria-hidden="true">
                *
              </span>
            </label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as FeedbackPostType)}
            >
              <SelectTrigger id="type" className="w-full">
                <SelectValue placeholder="请选择反馈类型" />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(FEEDBACK_TYPE_LABELS) as [
                    FeedbackPostType,
                    string,
                  ][]
                ).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label
            htmlFor="content"
            className="text-sm font-medium text-foreground"
          >
            详细内容
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              *
            </span>
          </label>
          <Textarea
            id="content"
            required
            rows={8}
            maxLength={10000}
            placeholder="请尽量详细描述：复现步骤、期望行为、截图链接等"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          {isAdmin && (
            <label className="flex items-center gap-2.5 text-sm text-foreground">
              <Checkbox
                checked={isAnnouncement}
                onCheckedChange={(checked) =>
                  setIsAnnouncement(checked === true)
                }
              />
              发布公告（所有用户可见，并推送系统消息）
            </label>
          )}
          {!isAnnouncement && (
            <label className="flex items-center gap-2.5 text-sm text-foreground">
              <Checkbox
                checked={isPrivate}
                onCheckedChange={(checked) => setIsPrivate(checked === true)}
              />
              仅管理员可见（私密帖不会出现在公共列表中）
            </label>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={!canSubmit}>
          {submitting ? "发布中…" : "发布"}
        </Button>
      </form>
    </main>
  );
}
