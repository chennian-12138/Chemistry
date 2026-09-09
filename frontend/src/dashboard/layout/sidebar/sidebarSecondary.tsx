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
import { useI18n } from "@/src/i18n/language-provider"

export default function AppSidebarSecondary() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { t } = useI18n()

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
                    <span>{item.i18nKey ? t(item.i18nKey as any) : item.name}</span>
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
