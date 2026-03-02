"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";

// Dynamically import Composer as it might rely on window/document objects which aren't available during SSR
const Composer = dynamic(() => import("@/components/kekule-react/composer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] flex items-center justify-center bg-muted/20 animate-pulse rounded-md border text-muted-foreground">
      Loading Molecule Editor...
    </div>
  ),
});

interface MolSearchProps {
  onSearch: (smarts: string, mode: "exact" | "substructure") => void;
  isLoading?: boolean;
  initialMode?: "exact" | "substructure";
}

const MolSearch: React.FC<MolSearchProps> = ({
  onSearch,
  isLoading = false,
  initialMode = "substructure",
}) => {
  const [molData, setMolData] = useState<string>("");
  const [searchMode, setSearchMode] = useState<"exact" | "substructure">(
    initialMode,
  );

  const handleSearch = () => {
    if (molData) {
      onSearch(molData, searchMode);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2 mb-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Structure Search
        </h2>
        <p className="text-muted-foreground text-sm">
          Draw a molecule structure or reaction to find matching results in the
          database.
        </p>
      </div>

      <Card className="p-1 overflow-hidden border bg-background shadow-sm">
        {/* Editor Area */}
        <div className="h-[450px] w-full bg-white relative">
          <Composer
            className="w-full h-full"
            exportFormat="molblock"
            onChange={(val) => setMolData(val)}
          />
        </div>
      </Card>

      {/* Action Area */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-sm font-medium whitespace-nowrap">
            Search Mode:
          </span>
          <Select
            value={searchMode}
            onValueChange={(val: "exact" | "substructure") =>
              setSearchMode(val)
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="substructure">Substructure Match</SelectItem>
              <SelectItem value="exact">Exact Match</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          size="lg"
          onClick={handleSearch}
          disabled={!molData || isLoading}
          className="w-full sm:w-auto px-8 font-medium transition-transform active:scale-95"
        >
          {isLoading ? "Searching..." : "Search Structure"}
        </Button>
      </div>
    </div>
  );
};

export default MolSearch;
