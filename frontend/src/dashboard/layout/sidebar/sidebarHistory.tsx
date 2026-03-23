"use client";

import { useEffect, useState } from "react";
import { MoreHorizontal, Trash2, BookSearch, FlaskConical, Bot } from "lucide-react";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuSubItem,
  SidebarMenuAction,
  SidebarMenuSub,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { getHistoryList, deleteHistory } from "@/lib/api";

// 根据 history type 返回对应的图标和路径前缀
const typeConfig: Record<string, { icon: typeof BookSearch; pathPrefix: string }> = {
  REACTDIC: { icon: BookSearch, pathPrefix: "/dashboard/reactdic" },
  RETRO_SYNTHESIS: { icon: FlaskConical, pathPrefix: "/dashboard/retrosynthesisanalysis" },
  AI_CHAT: { icon: Bot, pathPrefix: "/dashboard/askai" },
};

interface HistoryItem {
  id: string;
  type: string;
  targetId: string;
  title: string;
  createdAt: string;
}

export default function AppSidebarHistory() {
  const { isMobile } = useSidebar();
  const [records, setRecords] = useState<HistoryItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const fetchHistory = async () => {
      try {
        const res = await getHistoryList(10);
        if (!cancelled && res.success) {
          setRecords(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
      }
    };
    fetchHistory();
    return () => { cancelled = true; };
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const res = await deleteHistory(id);
      if (res.success) {
        setRecords((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete history:", err);
    }
  };

  if (records.length === 0) {
    return null;
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>History</SidebarGroupLabel>
      <SidebarMenuSub>
        {records.map((item) => {
          const config = typeConfig[item.type] || typeConfig.REACTDIC;
          const Icon = config.icon;
          const href = `${config.pathPrefix}/${item.targetId}`;

          return (
            <SidebarMenuSubItem key={item.id}>
              <SidebarMenuSubButton asChild>
                <Link href={href}>
                  <Icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuSubButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction showOnHover>
                    <MoreHorizontal />
                    <span className="sr-only">More</span>
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-48"
                  side={isMobile ? "bottom" : "right"}
                  align={isMobile ? "end" : "start"}
                >
                  <DropdownMenuItem onClick={() => handleDelete(item.id)}>
                    <Trash2 className="text-muted-foreground" />
                    <span>删除</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuSubItem>
          );
        })}
      </SidebarMenuSub>
    </SidebarGroup>
  );
}
