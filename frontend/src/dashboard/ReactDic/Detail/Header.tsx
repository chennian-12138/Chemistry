"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Thermometer,
  Droplets,
  Clock,
  Activity,
  Beaker,
  Atom,
} from "lucide-react";

interface HeaderProps {
  reaction: any;
  onBack: () => void;
}

export default function Header({ reaction, onBack }: HeaderProps) {
  const section = reaction.sections?.[0];

  // 收集有效的反应条件
  const conditionBadges: {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
  }[] = [];

  const addCondition = (
    icon: React.ReactNode,
    label: string,
    value: string | undefined | null,
    color: string,
  ) => {
    if (
      value &&
      value.trim() !== "-" &&
      value.trim() !== "N/A" &&
      value.trim() !== ""
    ) {
      conditionBadges.push({ icon, label, value: value.trim(), color });
    }
  };

  if (section) {
    addCondition(
      <Thermometer className="w-4 h-4" />,
      "温度",
      section.temperature,
      "bg-white border-[#84B179] text-[#84B179]",
    );
    addCondition(
      <Droplets className="w-4 h-4" />,
      "溶剂",
      section.solvent,
      "bg-white border-[#A2CB8B] text-[#A2CB8B]",
    );
    addCondition(
      <Clock className="w-4 h-4" />,
      "时间",
      section.duration,
      "bg-white border-[#C7EABB] text-[#C7EABB]",
    );
    addCondition(
      <Activity className="w-4 h-4" />,
      "压力",
      section.pressure,
      "bg-white border-[#E8F5BD] text-[#E8F5BD]",
    );
    addCondition(
      <Beaker className="w-4 h-4" />,
      "酸碱度",
      section.acidityBasicity,
      "bg-white border-[#AAC4F5] text-[#AAC4F5]",
    );
    addCondition(
      <Atom className="w-4 h-4" />,
      "浓度",
      section.concentration,
      "bg-white border-[#8CA9FF] text-[#8CA9FF]",
    );
  }

  return (
    <div className="space-y-5 mb-8">
      <Button
        variant="ghost"
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground pl-0 -ml-2 transition-colors duration-300"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        <span className="text-base">Back to Search</span>
      </Button>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
            {reaction.name}
          </h1>

          {/* 类型 + 标签 + 反应条件，全部以 Badge 形式排在一行 */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary uppercase tracking-widest text-xs px-2.5 py-0.5 font-semibold"
            >
              {reaction.mechanismType || "Unknown"}
            </Badge>
            {reaction.tags?.map((tag: string, i: number) => (
              <Badge
                key={i}
                variant="outline"
                className="text-muted-foreground text-xs px-2.5 py-0.5 bg-background"
              >
                {tag}
              </Badge>
            ))}
            {conditionBadges.map((c, i) => (
              <Badge key={`cond-${i}`} variant={"outline"} className={c.color}>
                {c.icon}
                <span className="text-muted-foreground">{c.label}:</span>
                <span className="text-foreground">{c.value}</span>
              </Badge>
            ))}
          </div>
        </div>

        {reaction.author && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 px-4 py-2 rounded-full border shadow-sm shrink-0">
            <span className="font-medium text-foreground">by</span>
            <span className="font-medium">
              {reaction.author.name || "Anonymous"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
