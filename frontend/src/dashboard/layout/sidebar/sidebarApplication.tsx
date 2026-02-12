"use client"

import * as React from "react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {routes} from "./routes"

const applicationRoutes = routes.Application;

export default function AppSidebarApplication() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Application</SidebarGroupLabel>
      <SidebarMenu>
        {applicationRoutes.map((route) => (
          <SidebarMenuItem key={route.name}>
            <SidebarMenuButton asChild tooltip={route.name}>
              <a href={route.Path || route.path}>
                <route.icon />
                <span>{route.name}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}