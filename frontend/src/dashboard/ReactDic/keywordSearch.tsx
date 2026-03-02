import React, { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface KeywordSearchProps {
  onSearch: (keyword: string) => void;
  isLoading?: boolean;
  initialKeyword?: string;
}

const KeywordSearch: React.FC<KeywordSearchProps> = ({
  onSearch,
  isLoading = false,
  initialKeyword = "",
}) => {
  const [keyword, setKeyword] = useState(initialKeyword);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (keyword.trim()) {
      onSearch(keyword.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center gap-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2 mb-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          Keyword Search
        </h2>
        <p className="text-muted-foreground text-sm">
          Search by reaction name, tags, or description words.
        </p>
      </div>

      <form
        onSubmit={handleSearch}
        className="relative w-full flex items-center shadow-sm rounded-full bg-background border hover:shadow-md transition-shadow group focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary"
      >
        <div className="pl-4 pr-2 text-muted-foreground group-focus-within:text-primary transition-colors">
          <Search className="w-5 h-5" />
        </div>
        <Input
          type="text"
          placeholder="e.g. Suzuki coupling, oxidation..."
          className="flex-1 border-0 shadow-none focus-visible:ring-0 rounded-full h-14 text-base px-2 bg-transparent"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="pr-2">
          <Button
            type="submit"
            size="lg"
            className="rounded-full px-6 h-10 font-medium transition-transform active:scale-95"
            disabled={!keyword.trim() || isLoading}
          >
            {isLoading ? "Searching..." : "Search"}
          </Button>
        </div>
      </form>

      {/* Optional: Popular searches / tags could go here */}
      <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground mt-2">
        <span>Popular:</span>
        <button
          type="button"
          onClick={() => setKeyword("Suzuki")}
          className="hover:text-primary transition-colors px-2 py-1 bg-secondary rounded-md"
        >
          Suzuki
        </button>
        <button
          type="button"
          onClick={() => setKeyword("Oxidation")}
          className="hover:text-primary transition-colors px-2 py-1 bg-secondary rounded-md"
        >
          Oxidation
        </button>
        <button
          type="button"
          onClick={() => setKeyword("Reduction")}
          className="hover:text-primary transition-colors px-2 py-1 bg-secondary rounded-md"
        >
          Reduction
        </button>
      </div>
    </div>
  );
};

export default KeywordSearch;
