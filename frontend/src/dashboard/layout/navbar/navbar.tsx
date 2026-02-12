"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import ThemeSwitchButton from "./navbar-ThemeSwitchButton";
import DataupNavbar from "./navbar-Dataup";
import { usePathname } from "next/navigation";
// import { Fragment } from "react"

function generateBreadcrumbs(pathname: string | null) {
  const pathArray = (pathname ?? "").split("/").filter(Boolean);
  return pathArray[1] || "";
}

export default function Navbar() {
  const pathname = usePathname();
  const currentPage = generateBreadcrumbs(pathname);
  return (
    <header className="flex h-16 shrink-0 items-center gap-2">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>{currentPage}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="ml-auto px-4">
        <DataupNavbar />
        <ThemeSwitchButton />
      </div>
    </header>
  );
}
