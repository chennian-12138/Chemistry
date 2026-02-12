import AppSidebar from "@/src/dashboard/layout/sidebar/sidebar";
import Navbar from "@/src/dashboard/layout/navbar/navbar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DataUpActionsProvider } from "@/hooks/use-dataup-action";
import * as React from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DataUpActionsProvider>
          <Navbar />
          {children}
        </DataUpActionsProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
