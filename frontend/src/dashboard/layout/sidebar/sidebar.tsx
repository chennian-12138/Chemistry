import AppSidebarApplication from "./sidebarApplication"
import AppSidebarHeader from "./sidebarHeader"
import AppSidebarHistory from "./sidebarHistory"
import AppSidebarSecondary from "./sidebarSecondary"
import AppSidebarUser  from "./sidebarUser"

import{
  Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarFooter,
} from "@/components/ui/sidebar"

export default function AppSidebar() {
  return (
    <>
    <Sidebar variant="inset">
    <SidebarHeader>
      <AppSidebarHeader />
    </SidebarHeader>
    <SidebarContent>
      <AppSidebarApplication />
      <AppSidebarHistory />
    <AppSidebarSecondary />
    </SidebarContent>
    <SidebarFooter>
      <AppSidebarUser />
    </SidebarFooter>
    </Sidebar>
    </>
  )
}