"use client";

import { useEffect } from "react";
import {
  BookSearch,
  FlaskConical,
  Bot,
  History as HistoryIcon,
} from "lucide-react";
import Link from "next/link";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { getHistoryList } from "@/lib/api";
import { useHistoryStore } from "@/store/history-store";

// 根据 history type 返回对应的图标和路径前缀
const typeConfig: Record<
  string,
  { icon: typeof BookSearch; pathPrefix: string }
> = {
  REACTDIC: { icon: BookSearch, pathPrefix: "/dashboard/reactdic" },
  RETRO_SYNTHESIS: {
    icon: FlaskConical,
    pathPrefix: "/dashboard/retrosynthesisanalysis",
  },
  AI_CHAT: { icon: Bot, pathPrefix: "/dashboard/askai" },
};

export default function AppSidebarHistory() {
  const { records, setRecords } = useHistoryStore();

  useEffect(() => {
    let cancelled = false;
    const fetchHistory = async () => {
      try {
        const res = await getHistoryList(20);
        if (!cancelled && res.success) {
          setRecords(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
      }
    };
    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [setRecords]);

  if (records.length === 0) {
    return null;
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .history-item-enter {
          animation: slideIn 0.3s ease-out forwards;
        }
      `}</style>
      <SidebarGroupLabel>History</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuSub>
            {records.slice(0, 9).map((item) => {
              const config = typeConfig[item.type] || typeConfig.REACTDIC;
              const Icon = config.icon;
              const href = `${config.pathPrefix}/${item.targetId}`;

              return (
                <SidebarMenuSubItem
                  key={item.id}
                  className="history-item-enter"
                >
                  <SidebarMenuSubButton asChild>
                    <Link href={href}>
                      <Icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
            {records.length > 9 && (
              <SidebarMenuSubItem className="history-item-enter">
                <SidebarMenuSubButton asChild>
                  <Link
                    href="/dashboard/history"
                    className="text-muted-foreground hover:text-foreground italic"
                  >
                    <HistoryIcon />
                    <span>查看更多...</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            )}
          </SidebarMenuSub>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
