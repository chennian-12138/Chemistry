"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Bookmark, ExternalLink, Calendar, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { togglePaperLike, togglePaperBookmark } from "@/lib/api";
import type { Paper } from "@/lib/api";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useRecordHistory } from "@/hooks/use-record-history";

interface PaperCardProps {
  paper: Paper;
  onUpdate?: (paperId: string, patch: Partial<Paper>) => void;
}

// 从最近到最远的5档颜色
// 亮色模式：深色边框突出（黑夜→白天 = 最新→最旧）
const BORDER_COLORS_LIGHT = [
  "#000407", // ≤7天
  "#071D28", // ≤30天
  "#0080C8", // ≤180天
  "#72C0F1", // ≤365天
  "#FAFEFF", // >365天
];
// 暗色模式：浅色边框突出（反转，白天→黑夜 = 最新→最旧）
const BORDER_COLORS_DARK = [
  "#FAFEFF",
  "#72C0F1",
  "#0080C8",
  "#071D28",
  "#000407",
];

function getDateBucket(publishedDate: string | null): number {
  if (!publishedDate) return 4;
  const diff = Date.now() - new Date(publishedDate).getTime();
  const days = diff / 86_400_000;
  if (days <= 7) return 0;
  if (days <= 30) return 1;
  if (days <= 180) return 2;
  if (days <= 365) return 3;
  return 4;
}

// JCR 分区固定配色：Q1 红 / Q2 橙 / Q3 蓝 / Q4 绿（半透明底 + 同色文字）
const QUARTILE_STYLE: Record<string, string> = {
  Q1: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25",
  Q2: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/25",
  Q3: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25",
  Q4: "bg-green-600/15 text-green-700 dark:text-green-400 border-green-600/25",
};

// 影响因子 → 色相：紫(280°)→品红→粉→红(360°)，故意跳过绿色段。
// 上限 25 封顶（Nature 等极高值本就少数，>25 统一深红）；
// 幂函数 0.7 让 IF>10 就快速进入暖色（粉/红），不再是"死亡绿"。
function getImpactHue(impactFactor: number): number {
  const CAP = 25;
  const t = Math.pow(Math.min(Math.max(impactFactor, 0), CAP) / CAP, 0.7); // 0~1
  return (280 + 80 * t) % 360; // 280(紫) → 360/0(红)
}

// 返回半透明底、淡边框、随明暗主题调整明度的文字色
function getImpactStyle(impactFactor: number, isDark: boolean): React.CSSProperties {
  const hue = getImpactHue(impactFactor).toFixed(0);
  return {
    backgroundColor: `hsla(${hue}, 80%, 50%, 0.15)`,
    color: `hsl(${hue}, ${isDark ? "70%, 65%" : "75%, 42%"})`,
    borderColor: `hsla(${hue}, 80%, 50%, 0.3)`,
  };
}

export default function PaperCard({ paper, onUpdate }: PaperCardProps) {
  const [liked, setLiked] = useState(paper.liked);
  const [likeCount, setLikeCount] = useState(paper.likeCount);
  const [bookmarked, setBookmarked] = useState(paper.bookmarked);
  const [likeLoading, setLikeLoading] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  const { session, requireAuth, loginPrompt } = useRequireAuth();
  const { record, registrationWall } = useRecordHistory();

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const bucket = getDateBucket(paper.publishedDate);
  const borderColor = isDark
    ? BORDER_COLORS_DARK[bucket]
    : BORDER_COLORS_LIGHT[bucket];

  const handleLink = () => {
    const url = paper.landingPageUrl;
    if (!url) return;
    if (session) {
      // 登录用户保持原行为：立即打开外链，历史异步落库
      void record("PAPER", url, paper.title);
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    // 匿名：本地历史已满时弹注册墙，且不打开外链
    void record("PAPER", url, paper.title).then((result) => {
      if (result === "quota-blocked") return;
      window.open(url, "_blank", "noopener,noreferrer");
    });
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!requireAuth()) return;
    if (likeLoading) return;
    setLikeLoading(true);
    try {
      const res = await togglePaperLike(paper.id);
      if (res.success) {
        const nextLiked = res.liked;
        const nextCount = nextLiked ? likeCount + 1 : likeCount - 1;
        setLiked(nextLiked);
        setLikeCount(nextCount);
        onUpdate?.(paper.id, { liked: nextLiked, likeCount: nextCount });
      }
    } finally {
      setLikeLoading(false);
    }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!requireAuth()) return;
    if (bookmarkLoading) return;
    setBookmarkLoading(true);
    try {
      const res = await togglePaperBookmark(paper.id);
      if (res.success) {
        setBookmarked(res.bookmarked);
        onUpdate?.(paper.id, { bookmarked: res.bookmarked });
      }
    } finally {
      setBookmarkLoading(false);
    }
  };

  // 格式化作者显示
  const authorText = (() => {
    if (!paper.authors) return null;
    const { firstAuthor, lastAuthor, institution } = paper.authors;
    if (!firstAuthor) return null;
    const sameAuthor = firstAuthor === lastAuthor || !lastAuthor;
    const names = sameAuthor ? firstAuthor : `${firstAuthor} ... ${lastAuthor}`;
    return institution ? `${names}（${institution}）` : names;
  })();

  // 格式化发布日期
  const dateText = paper.publishedDate
    ? new Date(paper.publishedDate).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <Card
      className="flex flex-col gap-0 hover:shadow-md transition-shadow duration-200 border-2"
      style={{ borderColor }}
    >
      <CardHeader className="pb-2 pt-4 px-4">
        {/* 标题行 */}
        <div className="flex items-start justify-between gap-2">
          <button
            onClick={handleLink}
            disabled={!paper.landingPageUrl}
            className="text-left text-sm font-semibold leading-snug line-clamp-2 hover:text-primary hover:underline underline-offset-2 disabled:cursor-default disabled:no-underline flex-1"
          >
            {paper.title}
          </button>
          {paper.landingPageUrl && (
            <ExternalLink
              className="mt-0.5 shrink-0 size-4 text-muted-foreground hover:text-primary cursor-pointer"
              onClick={handleLink}
            />
          )}
        </div>

        {/* 标签行：文章类型 + JCR 分区 + 影响因子 */}
        {(paper.articleType || paper.jcrQuartile || paper.impactFactor != null) && (
          <div className="flex flex-wrap items-center gap-1 mt-2">
            {paper.articleType && (
              <Badge
                variant={paper.articleType === "Review" ? "default" : "secondary"}
                className="text-xs"
              >
                {paper.articleType}
              </Badge>
            )}

            {/* JCR 分区：Q1 红 / Q2 橙 / Q3 蓝 / Q4 绿 */}
            {paper.jcrQuartile && QUARTILE_STYLE[paper.jcrQuartile] && (
              <Badge
                className={cn("text-xs", QUARTILE_STYLE[paper.jcrQuartile])}
              >
                {paper.jcrQuartile}
              </Badge>
            )}

            {/* 影响因子：色相随 IF 大小从紫渐变到红（半透明）*/}
            {paper.impactFactor != null && (
              <Badge
                variant="outline"
                className="text-xs"
                style={getImpactStyle(paper.impactFactor, isDark)}
              >
                IF {paper.impactFactor}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-2 px-4 pb-3 pt-0 flex-1">
        {/* 摘要（muted，与作者形成对比）*/}
        {paper.abstract && (
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
            {paper.abstract}
          </p>
        )}

        {/* 作者 + 机构：前景色，与摘要区分 */}
        {authorText && (
          <p className="text-xs text-foreground font-medium truncate">{authorText}</p>
        )}

        {/* 底部：期刊 + 日期 + 操作按钮 */}
        <div className="flex items-center justify-between gap-2 mt-auto pt-1">
          <div className="flex items-center gap-3 min-w-0">
            {paper.journalName && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                <BookOpen className="size-3 shrink-0" />
                <span className="truncate">{paper.journalName}</span>
              </span>
            )}
            {dateText && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                <Calendar className="size-3" />
                {dateText}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* 点赞 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={likeLoading}
              className="h-7 px-2 gap-1 text-xs"
            >
              <Heart
                className={cn("size-3.5", liked && "fill-rose-500 text-rose-500")}
              />
              <span className="tabular-nums">{likeCount}</span>
            </Button>

            {/* 收藏 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBookmark}
              disabled={bookmarkLoading}
              className="h-7 px-2"
            >
              <Bookmark
                className={cn(
                  "size-3.5",
                  bookmarked && "fill-amber-400 text-amber-400",
                )}
              />
            </Button>
          </div>
        </div>
      </CardContent>
      {loginPrompt}
      {registrationWall}
    </Card>
  );
}
