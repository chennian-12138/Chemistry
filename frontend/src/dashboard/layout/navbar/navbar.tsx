"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import ThemeSwitchButton from "./navbar-ThemeSwitchButton";
import DataupNavbar from "./navbar-Dataup";
import NavbarAskAiActions from "./navbar-AskAi";
import NavbarReactDicActions from "./navbar-ReactDic";
import { useAskAiActions } from "@/hooks/use-askai-action";
import { usePathname } from "next/navigation";
import { Bot } from "lucide-react";
// import { Fragment } from "react"

function generateBreadcrumbs(pathname: string | null) {
  const pathArray = (pathname ?? "").split("/").filter(Boolean);
  return pathArray[1] || "";
}

export default function Navbar() {
  const pathname = usePathname();
  const currentPage = generateBreadcrumbs(pathname);
  const { actions: askAiActions } = useAskAiActions();

  // 在 askai 页时，把「问问 AI」标题（会话标题）从页面提到 navbar 里显示
  const isAskAiPage =
    pathname === "/dashboard/askai" ||
    pathname?.startsWith("/dashboard/askai/");
  const showAskAiTitle = isAskAiPage && askAiActions.isAvailable;

  return (
    <header className="flex h-16 shrink-0 items-center gap-2">
      <div className="flex items-center gap-2 px-4 min-w-0">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <NavbarReactDicActions />
        {showAskAiTitle ? (
          <div className="flex items-center gap-2 min-w-0">
            <Bot className="size-5 text-primary shrink-0" />
            <span className="text-base font-semibold truncate">
              {askAiActions.title || "问问 AI"}
            </span>
          </div>
        ) : (
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>{currentPage}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )}
      </div>

      <div className="ml-auto flex items-center px-4">
        <NavbarAskAiActions />
        <DataupNavbar />
        {/* <ThemeSwitchButton /> */}
        {/* 同理，暂时隐藏，待后续再行使用 */}
      </div>
    </header>
  );
}
