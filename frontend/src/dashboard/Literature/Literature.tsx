"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, SortAsc, Loader2, Newspaper, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import PaperCard from "@/components/commonUI/PaperCard";
import {
  getPapers,
  getBookmarkedPapers,
  triggerDailyFetch,
} from "@/lib/api";
import { usePapersStore } from "@/store/papers-store";

// localStorage key：记录用户上次访问文献速递的日期，用于每日首次访问提示
const LAST_VISIT_KEY = "literature_last_visit";

// 根据日期预设计算 dateFrom（ISO date string）
function getDateFrom(preset: string): string | undefined {
  if (preset === "all") return undefined;
  const d = new Date();
  if (preset === "1m") d.setMonth(d.getMonth() - 1);
  else if (preset === "6m") d.setMonth(d.getMonth() - 6);
  else if (preset === "1y") d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split("T")[0];
}

export default function Literature() {
  const {
    papers,
    total,
    page,
    limit,
    keyword,
    sort,
    articleType,
    datePreset,
    isLoading,
    activeTab,
    setPapers,
    appendPapers,
    setPage,
    setKeyword,
    setSort,
    setArticleType,
    setDatePreset,
    setLoading,
    setActiveTab,
    updatePaper,
  } = usePapersStore();

  const [inputValue, setInputValue] = useState(keyword);
  const [fetching, setFetching] = useState(false);

  const hasMore = papers.length < total;

  const { data: session } = useSession();
  const isSuperAdmin =
    (session?.user as { role?: string } | undefined)?.role === "SUPERADMIN";

  // 标记本次 load 是否由"显示更多"触发（追加 vs 替换）
  const isAppendRef = useRef(false);
  // 标记本次 load 是否由搜索触发
  const isSearchRef = useRef(false);
  // 标记是否已完成首次加载
  const initialLoadDoneRef = useRef(false);

  // ---------- 每日首次访问提示 ----------
  useEffect(() => {
    const today = new Date().toDateString();
    const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
    if (lastVisit !== today) {
      localStorage.setItem(LAST_VISIT_KEY, today);
      setTimeout(() => {
        toast.info("文献数据每日自动更新，欢迎查阅最新进展");
      }, 800);
    }
  }, []);

  // ---------- SuperAdmin 触发增量爬取 ----------
  const handleTriggerFetch = async () => {
    if (fetching) return;
    setFetching(true);
    try {
      const res = await triggerDailyFetch();
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message || "增量爬取已在后台启动");
      }
    } catch {
      toast.error("触发失败，请检查 Python 服务是否运行");
    } finally {
      setFetching(false);
    }
  };

  // ---------- 主数据加载 ----------
  const load = useCallback(async () => {
    setLoading(true);
    const wasSearch = isSearchRef.current;
    const wasAppend = isAppendRef.current;
    isSearchRef.current = false;
    isAppendRef.current = false;
    try {
      if (activeTab === "feed") {
        const res = await getPapers({
          page,
          limit,
          keyword,
          sort,
          articleType,
          dateFrom: getDateFrom(datePreset),
        });
        if (res.success) {
          if (wasAppend) {
            appendPapers(res.data, res.total);
          } else {
            setPapers(res.data, res.total);
          }
          if (wasSearch) {
            if (res.total === 0) toast.info("未找到相关文献");
            else toast.success(`找到 ${res.total} 篇文献`);
          }
          if (!initialLoadDoneRef.current && !wasSearch && res.total > 0) {
            initialLoadDoneRef.current = true;
          }
        }
      } else {
        const res = await getBookmarkedPapers(page, limit);
        if (res.success) {
          if (wasAppend) appendPapers(res.data, res.total);
          else setPapers(res.data, res.total);
        }
      }
    } catch (e) {
      console.error("[Literature] load error:", e);
      toast.error("加载失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, limit, keyword, sort, articleType, datePreset]);

  useEffect(() => {
    load();
  }, [load]);

  // ---------- 搜索 ----------
  const handleSearch = () => {
    const trimmed = inputValue.trim();
    isSearchRef.current = true;
    setKeyword(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  // ---------- 显示更多 ----------
  const handleLoadMore = () => {
    if (isLoading || !hasMore) return;
    isAppendRef.current = true;
    setPage(page + 1);
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 w-full max-w-7xl mx-auto">

      {/* 页头 */}
      <div className="flex items-center gap-2 w-full">
        <Newspaper className="size-5 text-primary shrink-0" />
        <h1 className="text-xl font-semibold">文献速递</h1>
        <span className="text-sm text-muted-foreground ml-1 shrink-0">
          {total > 0 && `共 ${total} 篇`}
        </span>

        {isSuperAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleTriggerFetch}
            disabled={fetching}
            className="ml-auto h-8 gap-1 shrink-0"
          >
            <RefreshCw className={fetching ? "size-4 animate-spin" : "size-4"} />
            {fetching ? "触发中…" : "触发增量爬取"}
          </Button>
        )}
      </div>

      {/* Tab：全部 / 我的收藏 */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "feed" | "bookmarks")}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="feed">全部文献</TabsTrigger>
          <TabsTrigger value="bookmarks">我的收藏</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 搜索 & 筛选栏 */}
      {activeTab === "feed" && (
        <div className="flex flex-wrap gap-2 items-center w-full">
          {/* 关键词搜索 */}
          <div className="flex gap-1 flex-1 min-w-50">
            <Input
              placeholder="搜索标题或摘要…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-9 min-w-0"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSearch}
              className="h-9 px-3 shrink-0"
            >
              <Search className="size-4" />
            </Button>
          </div>

          {/* 文章类型筛选 */}
          <Select
            value={articleType}
            onValueChange={(v) => setArticleType(v)}
          >
            <SelectTrigger className="h-9 w-32 shrink-0">
              <SelectValue placeholder="全部类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="article">Article</SelectItem>
              <SelectItem value="review">Review</SelectItem>
            </SelectContent>
          </Select>

          {/* 日期筛选 */}
          <Select
            value={datePreset}
            onValueChange={(v) => setDatePreset(v)}
          >
            <SelectTrigger className="h-9 w-32 shrink-0">
              <SelectValue placeholder="全部时间" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部时间</SelectItem>
              <SelectItem value="1m">近 1 个月</SelectItem>
              <SelectItem value="6m">近 6 个月</SelectItem>
              <SelectItem value="1y">近 1 年</SelectItem>
            </SelectContent>
          </Select>

          {/* 排序 */}
          <Select
            value={sort}
            onValueChange={(v) => setSort(v as "date" | "likes" | "impact")}
          >
            <SelectTrigger className="h-9 w-32 shrink-0">
              <SortAsc className="size-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">最新发布</SelectItem>
              <SelectItem value="impact">影响因子</SelectItem>
              <SelectItem value="likes">最多点赞</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 内容区 */}
      <div className="w-full min-h-100">
        {isLoading && papers.length === 0 ? (
          <div className="flex justify-center items-center h-100">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : papers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-100 gap-2 text-muted-foreground">
            <Newspaper className="size-10 opacity-30" />
            <p className="text-sm">
              {activeTab === "bookmarks"
                ? "暂无收藏的文献"
                : keyword
                  ? `未找到与「${keyword}」相关的文献`
                  : "暂无文献数据，请先触发初始化爬取"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {papers.map((paper) => (
              <PaperCard key={paper.id} paper={paper} onUpdate={updatePaper} />
            ))}
          </div>
        )}
      </div>

      {/* 显示更多 */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={isLoading}
            className="min-w-32"
          >
            {isLoading ? (
              <><Loader2 className="size-4 mr-2 animate-spin" />加载中…</>
            ) : (
              `显示更多（已显示 ${papers.length} / ${total}）`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
