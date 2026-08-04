"use client";

import { createElement, useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { recordHistory } from "@/lib/api";
import { useHistoryStore } from "@/store/history-store";
import { recordGuestHistory } from "@/lib/guest-history";
import LoginPromptDialog from "@/components/auth/LoginPromptDialog";

export type RecordHistoryResult = "server" | "guest" | "quota-blocked";

// 统一的浏览历史记录入口：登录用户走后端落库（保留原乐观回填），
// 匿名用户写 localStorage 访客历史；满 7 条时弹出注册墙并返回 "quota-blocked"。
export function useRecordHistory() {
  const { data: session } = useSession();
  const [wallOpen, setWallOpen] = useState(false);
  // ref 镜像最新 session，保证 record 引用稳定（可安全放入 effect 依赖数组）；
  // hook 的 effect 先于调用方的 effect 执行，因此调用方 effect/事件里读到的一定是最新值
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const record = useCallback(
    async (
      type: string,
      targetId: string,
      title: string,
    ): Promise<RecordHistoryResult> => {
      if (sessionRef.current) {
        try {
          const res = await recordHistory(type, targetId, title);
          if (res?.success && res.data) {
            useHistoryStore.getState().addRecord(res.data);
          } else {
            // 接口没回完整记录时本地乐观回填（沿用原各调用点的 fallback 行为）
            useHistoryStore.getState().addRecord({
              id: Date.now().toString(),
              type,
              targetId,
              title,
              createdAt: new Date().toISOString(),
            });
          }
        } catch {
          // 历史记录失败不影响主流程
        }
        return "server";
      }

      const result = recordGuestHistory(type, targetId, title);
      if (!result.ok) {
        setWallOpen(true);
        return "quota-blocked";
      }
      useHistoryStore.getState().addRecord(result.record);
      return "guest";
    },
    [],
  );

  const registrationWall = createElement(LoginPromptDialog, {
    open: wallOpen,
    onOpenChange: setWallOpen,
    mode: "register-wall",
  });

  return { record, registrationWall };
}
