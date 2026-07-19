import { create } from "zustand";
import type { Paper } from "@/lib/api";

interface PapersState {
  papers: Paper[];
  total: number;
  page: number;
  limit: number;
  keyword: string;
  sort: "date" | "likes" | "impact";
  articleType: string; // "all" | "article" | "review"
  datePreset: string;  // "all" | "1m" | "6m" | "1y"
  isLoading: boolean;
  activeTab: "feed" | "bookmarks";

  // Actions
  setPapers: (papers: Paper[], total: number) => void;
  appendPapers: (papers: Paper[], total: number) => void;
  setPage: (page: number) => void;
  setKeyword: (keyword: string) => void;
  setSort: (sort: "date" | "likes" | "impact") => void;
  setArticleType: (t: string) => void;
  setDatePreset: (p: string) => void;
  setLoading: (loading: boolean) => void;
  setActiveTab: (tab: "feed" | "bookmarks") => void;
  updatePaper: (paperId: string, patch: Partial<Paper>) => void;
  reset: () => void;
}

const initialState = {
  papers: [] as Paper[],
  total: 0,
  page: 1,
  limit: 20,
  keyword: "",
  sort: "date" as "date" | "likes" | "impact",
  articleType: "all",
  datePreset: "all",
  isLoading: false,
  activeTab: "feed" as const,
};

export const usePapersStore = create<PapersState>((set) => ({
  ...initialState,

  setPapers: (papers, total) => set({ papers, total }),
  // 追加模式：保留已有卡片，在后面接上新一批
  appendPapers: (papers, total) =>
    set((state) => ({ papers: [...state.papers, ...papers], total })),
  setPage: (page) => set({ page }),
  setKeyword: (keyword) => set({ keyword, page: 1 }),
  setSort: (sort) => set({ sort, page: 1 }),
  setArticleType: (articleType) => set({ articleType, page: 1, papers: [], total: 0 }),
  setDatePreset: (datePreset) => set({ datePreset, page: 1, papers: [], total: 0 }),
  setLoading: (isLoading) => set({ isLoading }),
  setActiveTab: (activeTab) => set({ activeTab, page: 1, papers: [], total: 0 }),

  // 单篇文献的点赞/收藏状态局部更新，不重新请求列表
  updatePaper: (paperId, patch) =>
    set((state) => ({
      papers: state.papers.map((p) =>
        p.id === paperId ? { ...p, ...patch } : p,
      ),
    })),

  reset: () => set(initialState),
}));
