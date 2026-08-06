"use client";

import { useEffect, useState } from "react";
import {
  Newspaper,
  Bot,
  BookSearch,
  FlaskConical,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { getAdminOverview, getDashboardAnalytics } from "@/lib/api";
import AdminUsers from "./Users";

type FeatureTrendRow = {
  name: string;
  AI_CHAT: number;
  RETRO_SYNTHESIS: number;
  REACTDIC: number;
  PAPER: number;
};

interface Overview {
  users: { total: number; new30d: number };
  reactions: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    new30d: number;
  };
  papers: { total: number };
  conversations: { total: number };
  tags: { total: number };
  review: { reviewed30d: number };
  featureTrend: FeatureTrendRow[];
}

const FEATURE_CONFIG: {
  key: keyof FeatureTrendRow;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  { key: "PAPER", label: "文献速递", icon: Newspaper, color: "#092635" },
  { key: "AI_CHAT", label: "AI 对话", icon: Bot, color: "#1B4242" },
  { key: "REACTDIC", label: "反应搜索", icon: BookSearch, color: "#5C8374" },
  { key: "RETRO_SYNTHESIS", label: "逆反应分析", icon: FlaskConical, color: "#9EC8B9" },
];

function FeatureTrendCard({
  feature,
  data,
}: {
  feature: (typeof FEATURE_CONFIG)[number];
  data: FeatureTrendRow[];
}) {
  const key = feature.key;
  const total = data.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);
  const max = Math.max(1, ...data.map((row) => Number(row[key] ?? 0)));
  const chartConfig = {
    [key]: { label: feature.label, color: feature.color },
  } satisfies ChartConfig;

  return (
    <Card className="@container/card">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <feature.icon className="size-4" style={{ color: feature.color }} />
            {feature.label}
          </CardTitle>
          <div className="text-2xl font-bold tabular-nums">{total}</div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-2">
        <ChartContainer config={chartConfig} className="h-[80px] w-full">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={feature.color} stopOpacity={0.6} />
                <stop offset="95%" stopColor={feature.color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              tick={{ fontSize: 10 }}
              minTickGap={24}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Area
              dataKey={key}
              type="natural"
              fill={`url(#fill-${key})`}
              stroke={feature.color}
              strokeWidth={0.5}
              strokeOpacity={0.9}
            />
          </AreaChart>
        </ChartContainer>
        <div className="mt-1 flex items-center justify-between px-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full" style={{ background: feature.color }} />
            近6月使用量
          </span>
          <span className="tabular-nums">{max} 峰值</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminOverview() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [analytics, setAnalytics] = useState<{ name: string; clicks: number; users: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAdminOverview(), getDashboardAnalytics()])
      .then(([ov, an]) => {
        if (ov.success && ov.data) setOverview(ov.data);
        if (an.success && an.data) setAnalytics(an.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-muted-foreground">
        <ShieldAlert className="size-12 opacity-40" />
        <p>暂无统计数据</p>
      </div>
    );
  }

  const featureData: FeatureTrendRow[] = (overview.featureTrend ?? []).map((row) => ({
    name: String(row.name ?? ""),
    AI_CHAT: Number(row.AI_CHAT ?? 0),
    RETRO_SYNTHESIS: Number(row.RETRO_SYNTHESIS ?? 0),
    REACTDIC: Number(row.REACTDIC ?? 0),
    PAPER: Number(row.PAPER ?? 0),
  }));

  const visitConfig = {
    clicks: { label: "访问人数", color: "#6B7280" },
    users: { label: "注册人数", color: "#9CA3AF" },
  } satisfies ChartConfig;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">管理后台</h1>
        <p className="text-sm text-muted-foreground">
          平台运营概览 · 用户管理
        </p>
      </div>

      {/* 第一行：四大功能使用趋势 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURE_CONFIG.map((feature) => (
          <FeatureTrendCard key={feature.key} feature={feature} data={featureData} />
        ))}
      </div>

      {/* 第二行：访问人数 vs 注册人数 */}
      <Card>
        <CardHeader>
          <CardTitle>平台访问趋势</CardTitle>
          <CardDescription>近 6 个月访问人数与注册人数对比</CardDescription>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <ChartContainer config={visitConfig} className="aspect-auto h-[260px] w-full">
            <AreaChart data={analytics} margin={{ left: 0, right: 8, top: 4 }}>
              <defs>
                <linearGradient id="fill-clicks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={visitConfig.clicks.color} stopOpacity={0.5} />
                  <stop offset="95%" stopColor={visitConfig.clicks.color} stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="fill-users" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={visitConfig.users.color} stopOpacity={0.5} />
                  <stop offset="95%" stopColor={visitConfig.users.color} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Area
                dataKey="clicks"
                type="natural"
                fill="url(#fill-clicks)"
                stroke={visitConfig.clicks.color}
                strokeWidth={0.7}
                strokeOpacity={0.9}
              />
              <Area
                dataKey="users"
                type="natural"
                fill="url(#fill-users)"
                stroke={visitConfig.users.color}
                strokeWidth={0.7}
                strokeOpacity={0.9}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* 第三行：用户管理 */}
      <AdminUsers />
    </div>
  );
}
