"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Dynamically import Composer as it might rely on window/document objects which aren't available during SSR
const Composer = dynamic(() => import("@/components/kekule-react/composer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] flex items-center justify-center bg-muted/20 animate-pulse rounded-md border text-muted-foreground">
      加载分子编辑器中...
    </div>
  ),
});

interface MolSearchProps {
  onSearch: (molBlocks: string[]) => void;
  isLoading?: boolean;
}

const MolSearch: React.FC<MolSearchProps> = ({ onSearch, isLoading = false }) => {
  // 画布上每个分子的 MolBlock（支持多分子）
  const [molBlocks, setMolBlocks] = useState<string[]>([]);

  const molCount = molBlocks.length;

  const handleSearch = () => {
    if (molBlocks.length > 0) {
      onSearch(molBlocks);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2 mb-2">
        <h2 className="text-2xl font-semibold tracking-tight">结构搜索</h2>
        <p className="text-muted-foreground text-sm">
          可绘制一个或多个结构，我们会按「完整组合 / 全部包含 / 任一包含」三个层级为你匹配反应
        </p>
      </div>

      <Card className="p-1 overflow-hidden border bg-background shadow-sm">
        {/* Editor Area */}
        <div className="h-[450px] w-full bg-white relative">
          <Composer
            className="w-full h-full"
            exportFormat="molblock"
            onMolBlocksChange={(blocks) => setMolBlocks(blocks)}
          />
        </div>
      </Card>

      {/* Action Area */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground min-h-[1.5rem]">
          {molCount > 0 ? (
            <span>
              检测到 <span className="font-semibold text-foreground">{molCount}</span> 个分子
              {molCount > 1 ? "，将进行组合 / AND / OR 匹配" : ""}
            </span>
          ) : (
            <span>请在上方画布中绘制结构</span>
          )}
        </div>

        <Button
          size="lg"
          onClick={handleSearch}
          disabled={molCount === 0 || isLoading}
          className="w-full sm:w-auto px-8 font-medium transition-transform active:scale-95"
        >
          {isLoading ? "查询中..." : "查找结构"}
        </Button>
      </div>
    </div>
  );
};

export default MolSearch;
