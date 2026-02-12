"use client";

import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { useDataUpActions } from "@/hooks/use-dataup-action";
import { useState } from "react";
import ReviewSheet from "../../../../src/dashboard/DataUp/ReviewSheet";
import {
  CloudUpload,
  CloudDownload,
  FileBracesCorner,
  ListRestart,
} from "lucide-react";

export default function NavbarDataUpActions() {
  const pathname = usePathname();
  const { actions } = useDataUpActions();

  // 判断是否在 dataup 页面
  const isDataUpPage =
    pathname === "/dashboard/dataup" ||
    pathname?.startsWith("/dashboard/dataup/");

  // 不在 dataup 页面或 actions 未注册时不渲染
  if (!isDataUpPage || !actions.isAvailable) {
    return null;
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={actions.reset}
        className="gap-1"
      >
        <ListRestart className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={actions.exportJSON}
        className="gap-1"
      >
        <FileBracesCorner className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={actions.submit}
        className="gap-1"
      >
        <CloudUpload className="h-4 w-4" />
      </Button>

      <ReviewSheet
        triggerButton={
          <Button
            variant="ghost"
            size="icon"
            className="gap-1"
          >
            <CloudDownload className="h-4 w-4" />
          </Button>
        }
      />
    </>
  );
}
