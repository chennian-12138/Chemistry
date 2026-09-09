"use client";

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton
} from "@/components/ui/sidebar";
import Image from "next/image";
import Link from "next/link";
import logo from "@/public/LuoThink.png";
import { useI18n } from "@/src/i18n/language-provider";

export default function AppSidebarHeader() {
  const { t } = useI18n();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild>
        <Link href="/dashboard">
          <div className=" text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <Image alt="ChemDic Logo" src={logo} width={24} height={24} />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{t("app.name")}</span>
            <span className="truncate text-xs">ChemDic</span>
          </div>
        </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

