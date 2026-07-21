"use client";

import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { useAskAiActions } from "@/hooks/use-askai-action";
import { Plus } from "lucide-react";

export default function NavbarAskAiActions() {
  const pathname = usePathname();
  const { actions } = useAskAiActions();

  // 判断是否在 askai 页面
  const isAskAiPage =
    pathname === "/dashboard/askai" ||
    pathname?.startsWith("/dashboard/askai/");

  // 不在 askai 页面或 actions 未注册时不渲染
  if (!isAskAiPage || !actions.isAvailable) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={actions.newChat}
      className="gap-1"
      title="新对话"
    >
      <Plus className="h-4 w-4" />
    </Button>
  );
}
