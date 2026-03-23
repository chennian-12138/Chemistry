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
import { useSession } from "@/lib/auth-client";
import Link from "next/link";

const applicationRoutes = routes.Application;

export default function AppSidebarApplication() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Application</SidebarGroupLabel>
      <SidebarMenu>
        {applicationRoutes.map((route) => {
          const user = session?.user as unknown as { role?: string };
          const role = user?.role?.toLowerCase();
          if (
            route.name === "Review" &&
            role !== "admin" &&
            role !== "superadmin"
          ) {
            return null;
          }

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
                <Link href={route.Path}>
                  <route.icon />
                  <span>{route.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
