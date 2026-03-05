import { create } from "zustand";
import { ReviewItem } from "@/src/dashboard/review/reviewTable/reviewColumns";
import { ColumnFiltersState } from "@tanstack/react-table";

interface ReviewState {
  data: ReviewItem[];
  columnFilters: ColumnFiltersState;
  dateFilter: { from?: Date; to?: Date } | undefined;
  pageIndex: number;
  hasFetched: boolean;

  setData: (data: ReviewItem[]) => void;
  setColumnFilters: (filters: ColumnFiltersState) => void;
  setDateFilter: (filter: { from?: Date; to?: Date } | undefined) => void;
  setPageIndex: (index: number) => void;
  setHasFetched: (fetched: boolean) => void;
  updateItem: (id: string, updates: Partial<ReviewItem>) => void;
  removeItem: (id: string) => void;
  removeItems: (ids: string[]) => void;
}

export const useReviewStore = create<ReviewState>((set) => ({
  data: [],
  columnFilters: [],
  dateFilter: undefined,
  pageIndex: 0,
  hasFetched: false,

  setData: (data) => set({ data, hasFetched: true }),
  setColumnFilters: (columnFilters) => set({ columnFilters }),
  setDateFilter: (dateFilter) => set({ dateFilter }),
  setPageIndex: (pageIndex) => set({ pageIndex }),
  setHasFetched: (hasFetched) => set({ hasFetched }),
  updateItem: (id, updates) =>
    set((state) => ({
      data: state.data.map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      ),
    })),
  removeItem: (id) =>
    set((state) => ({
      data: state.data.filter((item) => item.id !== id),
    })),
  removeItems: (ids) =>
    set((state) => ({
      data: state.data.filter((item) => !ids.includes(item.id)),
    })),
}));
