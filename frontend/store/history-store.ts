import { create } from "zustand";

export interface HistoryItem {
  id: string;
  type: string;
  targetId: string;
  title: string;
  createdAt: string;
}

interface HistoryState {
  records: HistoryItem[];
  setRecords: (records: HistoryItem[]) => void;
  addRecord: (record: HistoryItem) => void;
  removeRecord: (id: string) => void;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  records: [],
  setRecords: (records) => set({ records }),
  addRecord: (record) =>
    set((state) => {
      // Remove any existing record with the same type and targetId to avoid duplicates in the UI
      const filtered = state.records.filter(
        (r) => !(r.type === record.type && r.targetId === record.targetId),
      );
      // Prepend new record
      const newRecords = [record, ...filtered].slice(0, 100); // Keep top 100
      return { records: newRecords };
    }),
  removeRecord: (id) =>
    set((state) => ({
      records: state.records.filter((r) => r.id !== id),
    })),
}));
