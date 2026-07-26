"use client";

import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function NavbarReactDicActions() {
  const pathname = usePathname();
  const router = useRouter();

  // 仅在 reactdic 详情页（/dashboard/reactdic/[id]）显示返回按钮
  const isReactDicDetailPage =
    pathname?.startsWith("/dashboard/reactdic/") &&
    pathname.split("/").filter(Boolean).length === 3;

  if (!isReactDicDetailPage) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => router.back()}
      className="gap-1"
      title="Back to Search"
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );
}
