"use client";

import { useEffect, useState } from "react";
import {
  Line,
  LineChart,
  LabelList,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { getDashboardAnalytics } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Loader2 } from "lucide-react";

const chartConfig = {
  clicks: {
    label: "网站点击量",
    color: "var(--foreground)",
  },
} satisfies ChartConfig;

interface AnalyticsData {
  name: string;
  month: string;
  clicks: number;
}

export default function ClicksChart() {
  const [data, setData] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getDashboardAnalytics();
        if (res.success) setData(res.data);
      } catch (err) {
        console.error("Fetch failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <Card className="w-full flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>网站点击量</CardTitle>
        <CardDescription>最近半年的访问趋势</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
          <LineChart
            accessibilityLayer
            data={data}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="clicks"
              stroke="var(--color-clicks)"
              strokeWidth={2}
              dot={{
                fill: "var(--color-clicks)",
              }}
              activeDot={{
                r: 6,
              }}
              isAnimationActive={false}
            />
            <LabelList
              position="top"
              offset={12}
              className="fill-foreground"
              fontSize={12}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
