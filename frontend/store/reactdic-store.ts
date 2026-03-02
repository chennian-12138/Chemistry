import { create } from "zustand";
import { ReactionData } from "@/src/dashboard/ReactDic/ReactCard";

interface ReactDicState {
  activeTab: string;
  searchKeyword: string;
  searchSmarts: string;
  searchMode: "exact" | "substructure";
  searchResults: ReactionData[];
  hasSearched: boolean;

  // Actions
  setActiveTab: (tab: string) => void;
  setSearchKeyword: (keyword: string) => void;
  setSearchSmarts: (smarts: string, mode: "exact" | "substructure") => void;
  setSearchResults: (results: ReactionData[]) => void;
  setHasSearched: (searched: boolean) => void;
  resetSearch: () => void;
}

export const useReactDicStore = create<ReactDicState>((set) => ({
  activeTab: "keyword",
  searchKeyword: "",
  searchSmarts: "",
  searchMode: "substructure",
  searchResults: [],
  hasSearched: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),
  setSearchSmarts: (smarts, mode) =>
    set({ searchSmarts: smarts, searchMode: mode }),
  setSearchResults: (results) => set({ searchResults: results }),
  setHasSearched: (searched) => set({ hasSearched: searched }),
  resetSearch: () => set({ searchResults: [], hasSearched: false }),
}));
