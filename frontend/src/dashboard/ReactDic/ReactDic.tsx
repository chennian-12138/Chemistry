"use client";

import React, { useState } from "react";
import KeywordSearch from "./keywordSearch";
import MolSearch from "./MolSearch";
import ReactionCard from "./ReactCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Beaker, Search, Dna } from "lucide-react";
import { searchReactDicKeyword, searchReactDicStructure } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useReactDicStore } from "@/store/reactdic-store";

export default function ReactDic() {
  const router = useRouter();
  const [isSearching, setIsSearching] = useState(false);

  // Zustand Store variables
  const {
    activeTab,
    setActiveTab,
    searchResults,
    setSearchResults,
    hasSearched,
    setHasSearched,
    searchKeyword,
    setSearchKeyword,
    searchMode,
    setSearchSmarts,
  } = useReactDicStore();

  // These mock functions will be connected to the backend API later
  const handleKeywordSearch = async (keyword: string) => {
    setIsSearching(true);
    setHasSearched(true);
    setSearchKeyword(keyword);
    try {
      const response = await searchReactDicKeyword(keyword);
      console.log(response);
      if (response.success) {
        setSearchResults(response.data);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error fetching keyword search:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleStructureSearch = async (
    smarts: string,
    mode: "exact" | "substructure",
  ) => {
    setIsSearching(true);
    setHasSearched(true);
    setSearchSmarts(smarts, mode);
    try {
      const response = await searchReactDicStructure(smarts, mode);
      if (response.success) {
        setSearchResults(response.data);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error fetching structure search:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex-1 w-full space-y-6 pt-6 pb-12 px-4 md:px-8">
      {/* Header section */}
      <div className="flex flex-col space-y-2 mb-8 animate-in fade-in duration-700">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Beaker className="w-8 h-8 text-primary" />
          Reaction Dictionary
        </h1>
        <p className="text-muted-foreground text-lg">
          Search, explore, and analyze chemical reactions from our database.
        </p>
      </div>

      {/* Main Search Tabs */}
      <div className="w-full bg-background rounded-xl border shadow-sm p-4 md:p-6 mb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-[400px] grid-cols-2 mx-auto mb-8">
            <TabsTrigger value="keyword" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Text Search
            </TabsTrigger>
            <TabsTrigger value="structure" className="flex items-center gap-2">
              <Dna className="w-4 h-4" />
              Structure Search
            </TabsTrigger>
          </TabsList>

          <div className="min-h-[300px]">
            <TabsContent value="keyword" className="mt-0 outline-none">
              <KeywordSearch
                onSearch={handleKeywordSearch}
                isLoading={isSearching}
                initialKeyword={searchKeyword}
              />
            </TabsContent>

            <TabsContent value="structure" className="mt-0 outline-none">
              <MolSearch
                onSearch={handleStructureSearch}
                isLoading={isSearching}
                initialMode={searchMode}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {isSearching ? (
        // Loading skeletons
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex flex-col h-[420px] rounded-xl border bg-card text-card-foreground shadow space-y-4 p-4 animate-pulse"
            >
              <div className="h-6 bg-muted rounded w-3/4"></div>
              <div className="h-56 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-5/6"></div>
            </div>
          ))}
        </div>
      ) : hasSearched ? (
        <div className="space-y-4 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold tracking-tight">
              Search Results
            </h2>
          </div>
          {searchResults.length === 0 ? (
            // No Results Found State
            <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/20 rounded-xl border border-dashed border-muted-foreground/20">
              <div className="bg-background p-4 rounded-full mb-4 shadow-sm ring-1 ring-border/50">
                <Search className="w-8 h-8 text-muted-foreground/60" />
              </div>
              <h3 className="text-lg font-medium text-foreground">
                No results found
              </h3>
              <p className="text-muted-foreground text-sm max-w-sm mt-2">
                我们暂时没有找到符合条件的反应，请尝试更换搜索条件。
              </p>
            </div>
          ) : (
            // Results Grid
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {searchResults.map((reaction) => (
                <ReactionCard
                  key={reaction.id}
                  data={reaction}
                  onClick={() => {
                    // Optional: handle clicking a reaction
                    console.log("Clicked reaction", reaction.id);
                    router.push(`/dashboard/reactdic/${reaction.id}`);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
