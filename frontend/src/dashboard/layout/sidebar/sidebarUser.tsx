"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogIn,
  LogOut,
  UserPlus,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { signOut, useSession } from "@/lib/auth-client";
import { getUnreadNotificationCount } from "@/lib/api";
import Link from "next/link";
import { usePathname } from "next/navigation";

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-medium leading-none text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function AppSidebarUser() {
  const { data: session, isPending, error } = useSession();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  const loggedIn = Boolean(session);
  useEffect(() => {
    if (!loggedIn) return;
    let cancelled = false;
    const refresh = async () => {
      const count = await getUnreadNotificationCount();
      if (!cancelled) setUnreadCount(count);
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pathname, loggedIn]);

  if (isPending) return <div>Loading...</div>;
  // 匿名用户：展示登录/注册入口，不再强制跳走
  if (!session) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip="登录">
            <Link href="/signin">
              <LogIn />
              <span>登录</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip="注册">
            <Link href="/signup">
              <UserPlus />
              <span>注册</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }
  if (error) return <div>Error: {error.message}</div>;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex items-center gap-1">
          {/* 头像 = 消息入口：有未读时右上角红点，点击直达消息盒子 */}
          <Link
            href="/dashboard/notifications"
            title="系统信息"
            className="relative shrink-0 rounded-lg p-1 transition-colors hover:bg-sidebar-accent"
          >
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage
                src={session.user.image || ""}
                alt={session.user.name}
              />
              <AvatarFallback className="rounded-lg">CN</AvatarFallback>
            </Avatar>
            <UnreadBadge count={unreadCount} />
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {session.user.name}
                  </span>
                  <span className="truncate text-xs">{session.user.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              // side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <div className="relative">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage
                        src={session.user.image || ""}
                        alt={session.user.name}
                      />
                      <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                    </Avatar>
                    <UnreadBadge count={unreadCount} />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {session.user.name}
                    </span>
                    <span className="truncate text-xs">
                      {session.user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <CreditCard />
                  积分
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/notifications">
                    <Bell />
                    系统信息
                    {unreadCount > 0 && (
                      <span className="ml-auto rounded-full bg-destructive px-1.5 text-[10px] font-medium text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await signOut();
                  // 登出后回到主页面，而不是留在 dashboard 进入匿名态
                  window.location.href = "/";
                }}
              >
                <LogOut />
                登出
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
