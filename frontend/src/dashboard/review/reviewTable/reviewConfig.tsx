"use client";

const HEADER_CONFIG = {
  ReactionName: "反应名称",
  UploadedBy: "上传者",
  Status: "状态",
  CreatedAt: "创建时间",
  action: "操作",
} as const;

export function HeaderCell({ columnId }: { columnId: string }) {
  return (
    <div className="text-center font-bold">
      {HEADER_CONFIG[columnId as keyof typeof HEADER_CONFIG] || columnId}
    </div>
  );
}

// 如下在配置状态页面映射状态到图标和样式
import { CircleX, CheckCircle, Loader } from "lucide-react";
import { Badge } from "@/components/ui/badge";
const STATUS_CONFIG = {
  PENDING: {
    label: "待审核",
    icon: Loader,
    className: "text-gray-600 border-blue-200",
    iconClassname: "text-blue-600 font-bold",
  },
  REJECTED: {
    label: "待修改",
    icon: CircleX,
    className: "text-grey-600 border-red-200",
    iconClassname: "text-red-400 font-bold",
  },
  APPROVED: {
    label: "通过",
    icon: CheckCircle,
    className: "text-grey-600 border-green-200",
    iconClassname: "text-green-400 font-bold",
  },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

export function BadgeStatus({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as StatusKey];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`gap-1.5 ${config.className}`}>
      <Icon className={`w-6 h-6 ${config.iconClassname}`} />
      {config.label}
    </Badge>
  );
}
