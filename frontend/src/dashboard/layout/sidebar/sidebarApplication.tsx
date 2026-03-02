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

const applicationRoutes = routes.Application;

export default function AppSidebarApplication() {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Application</SidebarGroupLabel>
      <SidebarMenu>
        {applicationRoutes.map((route) => {
          const isActive =
            pathname === route.Path ||
            (route.Path !== "/" && pathname.startsWith(route.Path));
          return (
            <SidebarMenuItem key={route.name}>
              <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={route.name}
              >
                <a href={route.Path}>
                  <route.icon />
                  <span>{route.name}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
