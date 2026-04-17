"use client";

import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { useDataUpActions } from "@/hooks/use-dataup-action";
import { useState } from "react";
import ReviewSheet from "../../DataUp/ReviewSheet";
import {
  CloudUpload,
  CloudDownload,
  ListRestart,
  Save,
  FolderOpen,
} from "lucide-react";
import DraftListSheet from "../../DataUp/DraftListSheet";

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

      <DraftListSheet
        triggerButton={
          <Button variant="ghost" size="icon" className="gap-1" title="草稿箱">
            <FolderOpen className="h-4 w-4" />
          </Button>
        }
      />

      <Button
        variant="ghost"
        size="icon"
        onClick={() => actions.saveDraft(false)}
        className="gap-1"
        title="暂存草稿"
      >
        <Save className="h-4 w-4" />
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
          <Button variant="ghost" size="icon" className="gap-1">
            <CloudDownload className="h-4 w-4" />
          </Button>
        }
      />
    </>
  );
}
