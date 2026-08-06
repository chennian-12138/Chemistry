"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart, Pin, PinOff, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  createFeedbackReply,
  deleteFeedbackPost,
  deleteFeedbackReply,
  getFeedbackPost,
  toggleFeedbackPostPin,
  toggleFeedbackReplyLike,
  updateFeedbackPostStatus,
  type FeedbackPostDetail,
  type FeedbackPostStatus,
  type FeedbackReplyItem,
} from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { formatRelativeTime } from "@/lib/time";

import {
  FeedbackFlagBadges,
  FeedbackStatusBadge,
  FeedbackTypeBadge,
} from "./shared";

interface ExpandedPostProps {
  postId: string;
  showHeader?: boolean;
  onDeleted: () => void;
  onSummaryChange?: (patch: {
    status?: FeedbackPostStatus;
    isPinned?: boolean;
  }) => void;
  onReplyCountDelta?: (delta: number) => void;
}

export default function ExpandedPost({
  postId,
  showHeader = false,
  onDeleted,
  onSummaryChange,
  onReplyCountDelta,
}: ExpandedPostProps) {
  const { data: session } = useSession();

  const currentUser = session?.user as unknown as
    | { id?: string; role?: string }
    | undefined;
  const role = currentUser?.role?.toLowerCase();
  const isAdmin = role === "admin" || role === "superadmin";

  const [post, setPost] = useState<FeedbackPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getFeedbackPost(postId)
      .then((res) => {
        if (!cancelled) setPost(res.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "获取帖子失败");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const runAction = useCallback(async (action: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "操作失败");
    }
  }, []);

  const isAuthor = Boolean(
    currentUser?.id && post?.author.id === currentUser.id,
  );
  const canModerate = isAuthor || isAdmin;

  const handleToggleStatus = () =>
    runAction(async () => {
      if (!post) return;
      const next = post.status === "OPEN" ? "RESOLVED" : "OPEN";
      await updateFeedbackPostStatus(post.id, next);
      setPost((p) => (p ? { ...p, status: next } : p));
      onSummaryChange?.({ status: next });
    });

  const handleTogglePin = () =>
    runAction(async () => {
      if (!post) return;
      const res = await toggleFeedbackPostPin(post.id);
      setPost((p) => (p ? { ...p, isPinned: res.data.isPinned } : p));
      onSummaryChange?.({ isPinned: res.data.isPinned });
    });

  const handleDelete = async () => {
    if (!post) return;
    if (!window.confirm("确定要删除这个帖子吗？删除后无法恢复。")) return;
    setActionError(null);
    try {
      await deleteFeedbackPost(post.id);
      onDeleted();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "删除失败");
    }
  };

  const handleToggleReplyLike = (reply: FeedbackReplyItem) =>
    runAction(async () => {
      const res = await toggleFeedbackReplyLike(reply.id);
      setPost((p) =>
        p
          ? {
              ...p,
              replies: p.replies.map((r) =>
                r.id === reply.id
                  ? {
                      ...r,
                      liked: res.data.liked,
                      likeCount: res.data.likeCount,
                    }
                  : r,
              ),
            }
          : p,
      );
    });

  const handleDeleteReply = (reply: FeedbackReplyItem) =>
    runAction(async () => {
      await deleteFeedbackReply(reply.id);
      setPost((p) =>
        p ? { ...p, replies: p.replies.filter((r) => r.id !== reply.id) } : p,
      );
      onReplyCountDelta?.(-1);
    });

  const handleSubmitReply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!post || !replyContent.trim() || replySubmitting) return;
    setReplySubmitting(true);
    setActionError(null);
    try {
      const res = await createFeedbackReply(post.id, replyContent.trim());
      setPost((p) => (p ? { ...p, replies: [...p.replies, res.data] } : p));
      setReplyContent("");
      onReplyCountDelta?.(1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "回复失败");
    } finally {
      setReplySubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3 py-2">
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-5/6 rounded bg-muted" />
        <div className="h-4 w-2/3 rounded bg-muted" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <p className="py-2 text-sm text-destructive" role="alert">
        {error ?? "帖子不存在或已被删除"}
      </p>
    );
  }

  const replies = [...post.replies].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <div>
      {showHeader && (
        <div className="mb-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <FeedbackFlagBadges post={post} />
            <FeedbackTypeBadge type={post.type} />
            <FeedbackStatusBadge status={post.status} />
          </div>
          <h2 className="mb-2 text-lg font-medium text-foreground">
            {post.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {post.author.name ?? post.author.email} ·{" "}
            {formatRelativeTime(post.createdAt)}
          </p>
        </div>
      )}

      <div className="mb-5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
        {post.content}
      </div>

      {(canModerate || isAdmin) && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {canModerate && (
            <Button variant="outline" size="sm" onClick={handleToggleStatus}>
              {post.status === "OPEN" ? "标记已解决" : "重新打开"}
            </Button>
          )}
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={handleTogglePin}>
              {post.isPinned ? <PinOff /> : <Pin />}
              {post.isPinned ? "取消置顶" : "置顶"}
            </Button>
          )}
          {canModerate && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 />
              删除
            </Button>
          )}
        </div>
      )}

      {actionError && (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      )}

      <div className="border-t border-border pt-5">
        <h3 className="mb-4 text-sm font-medium text-foreground">
          回复（{replies.length}）
        </h3>

        {replies.length > 0 && (
          <div className="mb-5 space-y-3">
            {replies.map((reply) => {
              const isOfficial =
                reply.author.role === "ADMIN" ||
                reply.author.role === "SUPERADMIN";
              const canDeleteReply =
                isAdmin ||
                Boolean(currentUser?.id && reply.author.id === currentUser.id);

              return (
                <div
                  key={reply.id}
                  className="rounded-lg border border-border bg-background p-4"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-foreground">
                      {reply.author.name ?? reply.author.email}
                    </span>
                    {isOfficial && <Badge variant="default">官方</Badge>}
                    <span className="text-muted-foreground">
                      {formatRelativeTime(reply.createdAt)}
                    </span>
                  </div>

                  <p className="mb-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {reply.content}
                  </p>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleReplyLike(reply)}
                      className={`inline-flex items-center gap-1 text-sm transition-colors ${
                        reply.liked
                          ? "text-destructive"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      aria-label="点赞回复"
                    >
                      <Heart
                        className={`size-4 ${reply.liked ? "fill-current" : ""}`}
                      />
                      {reply.likeCount}
                    </button>
                    {canDeleteReply && (
                      <button
                        type="button"
                        onClick={() => handleDeleteReply(reply)}
                        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-destructive"
                        aria-label="删除回复"
                      >
                        <Trash2 className="size-4" />
                        删除
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <form onSubmit={handleSubmitReply} className="space-y-3">
          <Textarea
            required
            rows={3}
            maxLength={5000}
            placeholder="友善交流，理性讨论……"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
          />
          <Button
            type="submit"
            size="sm"
            disabled={!replyContent.trim() || replySubmitting}
          >
            {replySubmitting ? "提交中…" : "提交回复"}
          </Button>
        </form>
      </div>
    </div>
  );
}
