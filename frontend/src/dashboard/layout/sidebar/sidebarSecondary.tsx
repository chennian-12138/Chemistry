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
import { useSession } from "@/lib/auth-client"

export default function AppSidebarSecondary() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const user = session?.user as unknown as { role?: string } | undefined
  const role = user?.role?.toLowerCase()
  const isAdmin = role === "admin" || role === "superadmin"
  const items = isAdmin ? routes.NavAdmin : routes.NavSecondary

  return (
    <SidebarGroup className="mt-auto">
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {

            const isActive = pathname === item.Path || (item.Path !== "/" && pathname.startsWith(item.Path))

            return(
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton asChild isActive={isActive}>
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
