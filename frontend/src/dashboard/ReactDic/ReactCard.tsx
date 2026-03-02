import React, { useState } from "react";
import Viewer from "@/components/kekule-react/viewer";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface ReactionData {
  id: number;
  name: string;
  description?: string;
  tags?: string[];
  structureData?: string;
}

interface ReactionCardProps {
  data: ReactionData;
  onClick?: () => void;
}

const ReactionCard: React.FC<ReactionCardProps> = ({ data, onClick }) => {
  // 控制 Viewer 是否加载的状态
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Card
      className="group relative flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg h-[420px] cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* 1. 顶部：标题 */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-4 px-5 bg-gradient-to-b from-muted/30 to-transparent">
        <CardTitle
          className="truncate text-[1.1rem] font-semibold text-foreground tracking-tight"
          title={data.name}
        >
          {data.name}
        </CardTitle>
      </CardHeader>

      {/* 2. 中部：动态 Viewer 区域 (核心逻辑) */}
      <CardContent className="p-0 flex-none relative">
        <div className="h-52 w-full relative flex items-center justify-center bg-dot-pattern dark:bg-zinc-950/50">
          {/* Subtle inner shadow for depth */}
          <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.02)] pointer-events-none" />

          {isHovered ? (
            // 状态 A: 鼠标悬停，加载 Viewer (带简单的淡入动画)
            <div className="w-full h-full animate-in fade-in zoom-in-95 duration-300">
              <Viewer value={data.structureData} />
            </div>
          ) : (
            // 状态 B: 默认状态，显示轻量级占位界面
            <div className="flex flex-col items-center justify-center text-muted-foreground/60 transition-colors duration-300 group-hover:text-primary">
              <div className="p-3 rounded-full bg-muted/30 mb-2 ring-1 ring-border/50">
                <svg
                  className="w-8 h-8 opacity-75"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  />
                </svg>
              </div>
              <span className="text-xs font-medium tracking-wide">
                Hover to view structure
              </span>
            </div>
          )}
        </div>
      </CardContent>

      {/* 3. 底部：信息摘要 */}
      <CardFooter className="flex flex-col items-start gap-4 p-5 flex-1 relative z-10 bg-card">
        {/* 标签 */}
        <div className="flex flex-wrap gap-2 h-6 overflow-hidden content-start">
          {data.tags && data.tags.length > 0 ? (
            data.tags.slice(0, 3).map((tag, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-[10px] px-2.5 py-0.5 h-auto font-medium bg-primary/5 hover:bg-primary/10 text-primary border-transparent transition-colors"
              >
                {tag}
              </Badge>
            ))
          ) : (
            <span className="text-[11px] text-muted-foreground/50 italic">
              Uncategorized
            </span>
          )}
        </div>

        {/* 描述 */}
        <CardDescription className="line-clamp-3 leading-relaxed w-full text-sm text-muted-foreground">
          {data.description ||
            "No detailed description provided for this reaction yet."}
        </CardDescription>
      </CardFooter>

      {/* 装饰：底部悬停渐变高亮条 */}
      <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out origin-left" />
    </Card>
  );
};

export default ReactionCard;
