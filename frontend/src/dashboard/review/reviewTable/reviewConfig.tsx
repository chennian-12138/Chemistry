"use client";

import { CircleX, CheckCircle2, Clock3, LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// 状态映射：标签 / 图标 / 样式（全模块统一：待审核 / 已通过 / 已拒绝）
const STATUS_CONFIG = {
  PENDING: {
    label: "待审核",
    icon: Clock3,
    className: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  },
  APPROVED: {
    label: "已通过",
    icon: CheckCircle2,
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  },
  REJECTED: {
    label: "已拒绝",
    icon: CircleX,
    className: "bg-red-500/10 text-red-600 border-red-500/30",
  },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

export const REVIEW_STATUS_CONFIG: Record<
  string,
  { label: string; icon: LucideIcon; className: string }
> = STATUS_CONFIG;

export function BadgeStatus({ status }: { status: string }) {
  const config =
    STATUS_CONFIG[status as StatusKey] ?? STATUS_CONFIG.PENDING;
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={`gap-1.5 px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </Badge>
  );
}
