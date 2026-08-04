"use client";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, FlaskConical, BookSearch, Newspaper } from "lucide-react";
import type { AccountStats, FeatureType } from "@/lib/api";

// 4 大主功能：类型、文案、单位、图标、明/暗配色（取自校验通过的分类调色板前 4 槽位）
const FEATURES: {
  type: FeatureType;
  label: string;
  unit: string;
  icon: any;
  light: string;
  dark: string;
}[] = [
  { type: "AI_CHAT", label: "AI 对话", unit: "个会话", icon: Bot, light: "#27374D", dark: "#C0E1D2" },
  { type: "RETRO_SYNTHESIS", label: "逆合成分析", unit: "条路线", icon: FlaskConical, light: "#526D82", dark: "#E5EEE4" },
  { type: "REACTDIC", label: "反应查询", unit: "个反应", icon: BookSearch, light: "#9DB2BF", dark: "#F6F4E8" },
  { type: "PAPER", label: "文献速递", unit: "篇文献", icon: Newspaper, light: "#DDE6ED", dark: "#DC9B9B" },
];

// shadcn ChartConfig：每个功能一条 series，theme 提供明/暗两套色
const chartConfig = FEATURES.reduce((acc, f) => {
  acc[f.type] = { label: f.label, theme: { light: f.light, dark: f.dark } };
  return acc;
}, {} as ChartConfig);

interface StatsCardsProps {
  stats: AccountStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  // 后端已保证 features 按 FEATURES 顺序返回，这里做一次容错查表
  const featureData = (type: FeatureType) =>
    stats.features.find((f) => f.type === type) ?? { type, total: 0, recent: 0 };

  const grandTotal = stats.features.reduce((s, f) => s + f.total, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* 4 张功能指标卡：累计总量 + 近 30 天增量 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 shrink-0">
        {FEATURES.map((f) => {
          const d = featureData(f.type);
          const Icon = f.icon;
          return (
            <Card key={f.type}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  {/* 图标以功能色着色作视觉锚点；文字标签独立承载身份，不依赖颜色 */}
                  <Icon className="size-4 shrink-0" style={{ color: f.light }} />
                  <span className="text-sm font-medium truncate">{f.label}</span>
                </div>
                <p className="text-4xl font-bold tabular-nums mt-3">{d.total}</p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {f.unit}
                  <span className="mx-1.5 text-border">·</span>
                  近 30 天{" "}
                  <span className={d.recent > 0 ? "text-foreground font-medium" : ""}>
                    +{d.recent}
                  </span>
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 近 6 个月使用趋势：按功能分层堆叠 */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="text-base">近 6 个月使用趋势</CardTitle>
          <CardDescription className="text-sm">各功能访问量按月分层</CardDescription>
        </CardHeader>
        <CardContent className="pb-4">
          {grandTotal === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">
              暂无使用记录，去体验一下各项功能吧
            </p>
          ) : (
            // 图表定高：页面不锁高度后父链无确定高度，ResponsiveContainer 必须给显式高度
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <AreaChart data={stats.trend} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                  tick={{ fontSize: 13, fill: "var(--muted-foreground)" }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                {FEATURES.map((f) => (
                  <Area
                    key={f.type}
                    dataKey={f.type}
                    name={f.label}
                    type="monotone"
                    stackId="usage"
                    stroke={`var(--color-${f.type})`}
                    fill={`var(--color-${f.type})`}
                    fillOpacity={0.75}
                    strokeWidth={1.5}
                  />
                ))}
                <ChartLegend content={<ChartLegendContent />} className="-translate-y-1" />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
