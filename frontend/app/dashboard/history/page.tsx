"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  BookSearch,
  FlaskConical,
  Bot,
  Trash2,
  Clock,
  ChevronRight,
  Search,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import {
  format,
  isToday,
  isYesterday,
  subDays,
  isAfter,
  parseISO,
} from "date-fns";
import { zhCN } from "date-fns/locale";

import { getHistoryList, deleteHistory } from "@/lib/api";
import { HistoryItem, useHistoryStore } from "@/store/history-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

const typeConfig: Record<
  string,
  { icon: any; label: string; pathPrefix: string; color: string }
> = {
  REACTDIC: {
    icon: BookSearch,
    label: "反应查询",
    pathPrefix: "/dashboard/reactdic",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  RETRO_SYNTHESIS: {
    icon: FlaskConical,
    label: "逆合成分析",
    pathPrefix: "/dashboard/retrosynthesisanalysis",
    color:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  AI_CHAT: {
    icon: Bot,
    label: "AI 问答",
    pathPrefix: "/dashboard/askai",
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
};

export default function HistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { records, setRecords, removeRecord } = useHistoryStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFullHistory = async () => {
      try {
        setIsLoading(true);
        const res = await getHistoryList(200); // Fetch a larger chunk for the full page
        if (res.success) {
          setRecords(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
        toast.error("加载历史记录失败");
      } finally {
        setIsLoading(false);
      }
    };
    fetchFullHistory();
  }, [setRecords]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await deleteHistory(id);
      if (res.success) {
        removeRecord(id);
        toast.success("记录已删除");
      }
    } catch (err) {
      toast.error("删除失败");
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter(
      (item) =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.type.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [records, searchTerm]);

  const groupedRecords = useMemo(() => {
    const groups: Record<string, HistoryItem[]> = {
      今天: [],
      昨天: [],
      "最近 7 天": [],
      更早之前: [],
    };

    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);

    filteredRecords.forEach((item) => {
      const date = parseISO(item.createdAt);
      if (isToday(date)) {
        groups["今天"].push(item);
      } else if (isYesterday(date)) {
        groups["昨天"].push(item);
      } else if (isAfter(date, sevenDaysAgo)) {
        groups["最近 7 天"].push(item);
      } else {
        groups["更早之前"].push(item);
      }
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [filteredRecords]);

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">查询历史</h2>
          <p className="text-muted-foreground">
            管理您过去在项目中进行的所有查询与互动记录。
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索历史记录..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-[400px] items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm text-muted-foreground">加载中...</p>
          </div>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed">
          <div className="flex flex-col items-center space-y-2 text-center">
            <Clock className="h-10 w-10 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold">暂无记录</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm
                ? "没有找到匹配的搜索结果。"
                : "您目前还没有任何浏览历史。"}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedRecords.map(([groupName, items]) => (
            <div key={groupName} className="space-y-4">
              <div className="flex items-center space-x-2 px-1">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                  {groupName}
                </h3>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => {
                  const config = typeConfig[item.type] || typeConfig.REACTDIC;
                  const Icon = config.icon;
                  return (
                    <Link
                      key={item.id}
                      href={`${config.pathPrefix}/${item.targetId}`}
                      className="group relative"
                    >
                      <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                          <div className="space-y-1">
                            <Badge variant="secondary" className={config.color}>
                              <Icon className="mr-1 h-3 w-3" />
                              {config.label}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => handleDelete(e, item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </CardHeader>
                        <CardContent>
                          <CardTitle className="text-base line-clamp-1 group-hover:text-primary transition-colors">
                            {item.title}
                          </CardTitle>
                          <CardDescription className="flex items-center mt-2">
                            <Clock className="mr-1 h-3 w-3" />
                            {format(parseISO(item.createdAt), "HH:mm", {
                              locale: zhCN,
                            })}
                          </CardDescription>
                        </CardContent>
                        <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all text-primary">
                          <ChevronRight className="h-5 w-5" />
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
