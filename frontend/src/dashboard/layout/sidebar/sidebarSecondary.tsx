"use client"

import * as React from "react"
import Link from "next/link"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import { routes } from "./routes"
import { usePathname } from "next/navigation"

const items = routes.NavSecondary

export default function AppSidebarSecondary() {

  const pathname = usePathname()

  return (
    <SidebarGroup className="mt-auto">
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {

            const isActive = pathname === item.Path || (item.Path !== "/" && pathname.startsWith(item.Path))

            return(
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton asChild isActive={isActive} size="sm">
                  <Link href={item.Path}>
                    <item.icon />
                    <span>{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
