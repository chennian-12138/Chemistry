"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, Heart, MessageSquare, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/src/i18n/language-provider";
import {
  getFeedbackPosts,
  toggleFeedbackPostLike,
  type FeedbackPostStatus,
  type FeedbackPostSummary,
  type FeedbackPostType,
} from "@/lib/api";
import { formatRelativeTime } from "@/lib/time";

import ExpandedPost from "./expanded-post";
import {
  FeedbackFlagBadges,
  FeedbackStatusBadge,
  FeedbackTypeBadge,
} from "./shared";

const PAGE_SIZE = 10;

type TypeFilter = "all" | FeedbackPostType;

export default function FeedbackPage() {
  return (
    <Suspense
      fallback={
        <main className="w-full px-6 py-16 md:px-10 md:py-20">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/3 rounded bg-muted" />
            <div className="h-40 rounded-lg border border-border bg-card" />
          </div>
        </main>
      }
    >
      <FeedbackForum />
    </Suspense>
  );
}

function FeedbackForum() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const locatedId = searchParams.get("post");

  const [posts, setPosts] = useState<FeedbackPostSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const deepLinkApplied = useRef(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getFeedbackPosts({
        page,
        pageSize: PAGE_SIZE,
        type: typeFilter === "all" ? undefined : typeFilter,
      });
      setPosts(res.data.posts);
      setTotal(res.data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取帖子列表失败");
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter]);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    if (deepLinkApplied.current || loading || !locatedId) return;
    deepLinkApplied.current = true;
    if (posts.some((p) => p.id === locatedId)) {
      setExpandedId(locatedId);
    }
  }, [loading, posts, locatedId]);

  const handleTypeChange = (value: TypeFilter) => {
    setTypeFilter(value);
    setPage(1);
    setExpandedId(null);
  };

  const handleToggleLike = async (post: FeedbackPostSummary) => {
    try {
      const res = await toggleFeedbackPostLike(post.id);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, liked: res.data.liked, likeCount: res.data.likeCount }
            : p,
        ),
      );
    } catch {
      // 点赞失败不打断浏览，保持原状
    }
  };

  const patchPost = (
    id: string,
    patch: Partial<
      Pick<FeedbackPostSummary, "status" | "isPinned" | "replyCount">
    >,
  ) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const removePost = (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setTotal((t) => Math.max(0, t - 1));
    setExpandedId((cur) => (cur === id ? null : cur));
  };

  const typeFilters: { value: TypeFilter; label: string }[] = [
    { value: "all", label: t("fb.all") },
    { value: "suggestion", label: t("fb.suggestion") },
    { value: "bug", label: t("fb.bug") },
    { value: "feature", label: t("fb.feature") },
    { value: "other", label: t("fb.other") },
  ];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const locatedInList =
    locatedId !== null && posts.some((p) => p.id === locatedId);
  const showStandalone = locatedId !== null && !loading && !locatedInList;

  return (
    <main className="w-full px-6 py-16 md:px-10 md:py-20">
      <section className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="mb-4 text-3xl font-medium tracking-tight text-foreground md:text-4xl">
            {t("fb.title")}
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
            {t("fb.hint")}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/feedback/new">
            <Plus />
            {t("fb.new")}
          </Link>
        </Button>
      </section>

      <section className="mb-8 flex flex-wrap gap-2">
        {typeFilters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => handleTypeChange(f.value)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              typeFilter === f.value
                ? "border-foreground/40 bg-foreground text-background"
                : "border-border bg-card text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </section>

      {error && (
        <div className="mb-8 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {showStandalone && (
        <div className="mb-8">
          <p className="mb-2 text-xs text-muted-foreground">当前定位的帖子</p>
          <article className="rounded-lg border border-border bg-card p-6">
            <ExpandedPost
              postId={locatedId}
              showHeader
              onDeleted={() => router.replace("/dashboard/feedback")}
            />
          </article>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border border-border bg-card p-6"
            >
              <div className="mb-3 h-5 w-1/3 rounded bg-muted" />
              <div className="h-4 w-2/3 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 && !error ? (
        <div className="rounded-lg border border-border bg-card px-8 py-16 text-center">
          <p className="text-lg font-medium text-foreground">暂无帖子</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("fb.emptyHint")}
          </p>
        </div>
      ) : (
        <section className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              expanded={expandedId === post.id}
              onToggleExpand={() =>
                setExpandedId((cur) => (cur === post.id ? null : post.id))
              }
              onToggleLike={handleToggleLike}
              onSummaryChange={(patch) => patchPost(post.id, patch)}
              onReplyCountDelta={(delta) =>
                patchPost(post.id, { replyCount: post.replyCount + delta })
              }
              onDeleted={() => removePost(post.id)}
            />
          ))}
        </section>
      )}

      {!loading && total > PAGE_SIZE && (
        <section className="mt-10 flex items-center justify-between">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {t("fb.prev")}
          </Button>
          <p className="text-sm text-muted-foreground">
            {t("fb.pageInfo").replace("{page}", String(page)).replace("{totalPages}", String(totalPages)).replace("{total}", String(total))}
          </p>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("fb.next")}
          </Button>
        </section>
      )}
    </main>
  );
}

function PostCard({
  post,
  expanded,
  onToggleExpand,
  onToggleLike,
  onSummaryChange,
  onReplyCountDelta,
  onDeleted,
}: {
  post: FeedbackPostSummary;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleLike: (post: FeedbackPostSummary) => void;
  onSummaryChange: (patch: {
    status?: FeedbackPostStatus;
    isPinned?: boolean;
  }) => void;
  onReplyCountDelta: (delta: number) => void;
  onDeleted: () => void;
}) {
  return (
    <article className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-muted-foreground/30">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <FeedbackFlagBadges post={post} />
        <FeedbackTypeBadge type={post.type} />
        <FeedbackStatusBadge status={post.status} />
      </div>

      <h2 className="mb-2 text-lg font-medium text-foreground">{post.title}</h2>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <span>{post.author.name ?? post.author.email}</span>
        <span>{formatRelativeTime(post.createdAt)}</span>
        <button
          type="button"
          onClick={() => onToggleLike(post)}
          className={`inline-flex items-center gap-1 transition-colors ${
            post.liked ? "text-destructive" : "hover:text-foreground"
          }`}
          aria-label="点赞"
        >
          <Heart className={`size-4 ${post.liked ? "fill-current" : ""}`} />
          {post.likeCount}
        </button>
        <button
          type="button"
          onClick={onToggleExpand}
          className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
          aria-expanded={expanded}
        >
          <MessageSquare className="size-4" />
          {post.replyCount}
          {expanded ? "收起评论" : "展开评论"}
          {expanded ? (
            <ChevronUp className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="mt-5 border-t border-border pt-5">
          <ExpandedPost
            postId={post.id}
            onDeleted={onDeleted}
            onSummaryChange={onSummaryChange}
            onReplyCountDelta={onReplyCountDelta}
          />
        </div>
      )}
    </article>
  );
}
