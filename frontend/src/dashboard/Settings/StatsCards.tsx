"use client";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  Pie,
  PieChart,
  Cell,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AccountStats } from "@/lib/api";

// 全灰度配色：深灰 / 中灰 / 浅灰
const PIE_COLORS = ["#111827", "#6b7280", "#d1d5db"];

const reactionConfig = {
  已通过: { label: "已通过", color: "#111827" },
  待审核: { label: "待审核", color: "#6b7280" },
  已退回: { label: "已退回", color: "#d1d5db" },
} satisfies ChartConfig;

const activityConfig = {
  clicks: { label: "浏览次数", color: "#6b7280" },
} satisfies ChartConfig;

interface StatsCardsProps {
  stats: AccountStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const total = stats.totals.reactions;

  return (
    <div className="flex flex-col h-full gap-6">
      {/* 4 个指标数字 — 每个用 Card 包裹 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 shrink-0">
        {[
          { label: "提交反应", value: total },
          { label: "审核通过", value: stats.totals.approved },
          { label: "云端草稿", value: stats.totals.drafts },
          { label: "浏览记录", value: stats.totals.history },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-6">
              <p className="text-4xl font-bold tabular-nums">{item.value}</p>
              <p className="text-sm text-muted-foreground mt-2">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 flex-1 min-h-0">
        {/* 反应提交状态饼图 */}
        <Card className="flex flex-col flex-1 min-h-0">
          <CardHeader className="shrink-0">
            <CardTitle className="text-base">反应提交状态</CardTitle>
            <CardDescription className="text-sm">历史提交分布</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 pb-4">
            {total === 0 ? (
              <p className="text-sm text-muted-foreground py-10 text-center">
                暂无提交记录
              </p>
            ) : (
              <ChartContainer config={reactionConfig} className="h-full w-full min-h-40">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={stats.reactionStatus}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={74}
                    paddingAngle={3}
                  >
                    {stats.reactionStatus.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartLegend
                    content={<ChartLegendContent nameKey="name" />}
                    className="-translate-y-2"
                  />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* 近 6 个月活跃度 */}
        <Card className="flex flex-col flex-1 min-h-0">
          <CardHeader className="shrink-0">
            <CardTitle className="text-base">近 6 个月浏览活跃度</CardTitle>
            <CardDescription className="text-sm">按月浏览次数</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 pb-4">
            <ChartContainer config={activityConfig} className="h-full w-full min-h-40">
              <AreaChart data={stats.activity} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                  tick={{ fontSize: 13, fill: "#6b7280" }}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Area
                  dataKey="clicks"
                  type="natural"
                  fill="#6b7280"
                  fillOpacity={0.15}
                  stroke="#111827"
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
