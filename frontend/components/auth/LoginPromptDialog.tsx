"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface LoginPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // login：匿名触发需登录功能；register-wall：本地历史满 7 条，引导注册解锁
  mode?: "login" | "register-wall";
}

export default function LoginPromptDialog({
  open,
  onOpenChange,
  mode = "login",
}: LoginPromptDialogProps) {
  const isWall = mode === "register-wall";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isWall ? "历史记录已达上限" : "需要登录"}
          </DialogTitle>
          <DialogDescription>
            {isWall
              ? "本地历史最多保存 7 条，注册账号解锁无限历史记录"
              : "该功能需要登录后使用"}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" asChild>
            <Link href="/signup">注册</Link>
          </Button>
          <Button asChild>
            <Link href="/signin">登录</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
