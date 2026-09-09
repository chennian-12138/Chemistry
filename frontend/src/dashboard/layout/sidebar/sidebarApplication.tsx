"use client";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { routes } from "./routes";
import { usePathname } from "next/navigation";
import { useI18n } from "@/src/i18n/language-provider";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";

const applicationRoutes = routes.Application;

export default function AppSidebarApplication() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useI18n();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t("nav.group")}</SidebarGroupLabel>
      <SidebarMenu>
        {applicationRoutes.map((route) => {
          const user = session?.user as unknown as { role?: string };
          const role = user?.role?.toLowerCase();
          if (
            (route.Path === "/dashboard/review" ||
              route.Path === "/dashboard/dataup") &&
            role !== "admin" &&
            role !== "superadmin"
          ) {
            return null;
          }

          const isActive =
            pathname === route.Path ||
            (route.Path !== "/" && pathname.startsWith(route.Path));
          const label = route.i18nKey ? t(route.i18nKey as any) : route.name;
          return (
            <SidebarMenuItem key={route.name}>
              <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={label}
              >
                <Link href={route.Path}>
                  <route.icon />
                  <span>{label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
