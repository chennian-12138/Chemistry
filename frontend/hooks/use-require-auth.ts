"use client";

import { createElement, useCallback, useState } from "react";
import { useSession } from "@/lib/auth-client";
import LoginPromptDialog from "@/components/auth/LoginPromptDialog";

// 账号绑定动作的统一拦截：已登录返回 true；匿名弹出共享登录提示框并返回 false。
// 调用方把 loginPrompt 挂到自己的 JSX 里（对话框的 open 状态由本 hook 持有）。
export function useRequireAuth() {
  const { data: session, isPending } = useSession();
  const [promptOpen, setPromptOpen] = useState(false);

  const requireAuth = useCallback(() => {
    if (session) return true;
    setPromptOpen(true);
    return false;
  }, [session]);

  const loginPrompt = createElement(LoginPromptDialog, {
    open: promptOpen,
    onOpenChange: setPromptOpen,
  });

  return { session, isPending, requireAuth, loginPrompt };
}
