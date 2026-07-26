import { create } from "zustand";
import { ReactionData } from "@/src/dashboard/ReactDic/ReactCard";

interface ReactDicState {
  activeTab: string;
  searchKeyword: string;
  searchMolBlocks: string[];
  searchResults: ReactionData[];
  hasSearched: boolean;

  // Actions
  setActiveTab: (tab: string) => void;
  setSearchKeyword: (keyword: string) => void;
  setSearchMolBlocks: (blocks: string[]) => void;
  setSearchResults: (results: ReactionData[]) => void;
  setHasSearched: (searched: boolean) => void;
  resetSearch: () => void;
}

export const useReactDicStore = create<ReactDicState>((set) => ({
  activeTab: "keyword",
  searchKeyword: "",
  searchMolBlocks: [],
  searchResults: [],
  hasSearched: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),
  setSearchMolBlocks: (blocks) => set({ searchMolBlocks: blocks }),
  setSearchResults: (results) => set({ searchResults: results }),
  setHasSearched: (searched) => set({ hasSearched: searched }),
  resetSearch: () => set({ searchResults: [], hasSearched: false }),
}));
