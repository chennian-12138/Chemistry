"use client";

import { ArrowUpToLine, MoreHorizontal, Share, Trash2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuSubItem,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { routes } from "./routes";

const records = routes.History;

export default function AppSidebarHistory() {
  const { isMobile } = useSidebar();

  return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>History</SidebarGroupLabel>
        <SidebarMenuSub>
          {records.map((item) => (
            <SidebarMenuSubItem key={item.title}>
              <SidebarMenuSubButton asChild>
                <a href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </a>
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
                  <DropdownMenuItem>
                    <ArrowUpToLine className="text-muted-foreground" />
                    <span>置顶</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Share className="text-muted-foreground" />
                    <span>分享</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Trash2 className="text-muted-foreground" />
                    <span>删除</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuSubItem>
          ))}
          <SidebarMenuSubItem>
            <SidebarMenuButton>
              <MoreHorizontal />
              <span>更多</span>
            </SidebarMenuButton>
          </SidebarMenuSubItem>
        </SidebarMenuSub>
      </SidebarGroup>
  );
}
