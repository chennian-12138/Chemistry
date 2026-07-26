"use client";

import React from "react";
import Viewer from "@/components/kekule-react/viewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Beaker,
  Thermometer,
  Droplets,
  Droplet,
  Clock,
  Activity,
  Atom,
  FlaskConical,
  Zap,
  FileText,
} from "lucide-react";
import DOMPurify from "dompurify";

interface MainContentProps {
  reaction: any;
}

// 与 DataUp 表单 conditionFieldsConfig 保持一致的条件字段
const CONDITION_FIELDS = [
  { field: "temperature", label: "温度", icon: Thermometer },
  { field: "solvent", label: "溶剂类型", icon: Droplets },
  { field: "duration", label: "时间", icon: Clock },
  { field: "pressure", label: "压力", icon: Activity },
  { field: "concentration", label: "浓度", icon: Atom },
  { field: "microwave", label: "微波", icon: Zap },
  { field: "acidityBasicity", label: "酸碱性", icon: FlaskConical },
  { field: "hydro", label: "水含量", icon: Droplet },
];

function isValidValue(value: string | undefined | null): value is string {
  return (
    !!value &&
    value.trim() !== "" &&
    value.trim() !== "-" &&
    value.trim() !== "N/A"
  );
}

/** 单个 section 的反应条件 chips（只展示有效值） */
function ConditionChips({ section }: { section: any }) {
  const chips = CONDITION_FIELDS.filter((c) => isValidValue(section[c.field]));

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map(({ field, label, icon: Icon }) => (
        <span
          key={field}
          className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-2.5 py-1 text-xs"
        >
          <Icon className="w-3.5 h-3.5 text-primary/70" />
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium text-foreground">
            {section[field].trim()}
          </span>
        </span>
      ))}
    </div>
  );
}

export default function MainContent({ reaction }: MainContentProps) {
  const sections = reaction.sections || [];

  return (
    <div className="space-y-6">
      {sections.map((section: any, idx: number) => {
        const validReactions = (section.reactions || []).filter(
          (r: any) => r.value,
        );
        const hasScheme = validReactions.length > 0;
        const descriptions = section.descriptions || [];
        const hasDescriptions = descriptions.length > 0;

        return (
          <Card
            key={section.id || idx}
            className="overflow-hidden shadow-md border-muted/60"
          >
            <CardHeader className="border-b bg-muted/20 space-y-3">
              <CardTitle className="text-base flex items-center gap-2 font-semibold">
                <Beaker className="w-4 h-4 text-primary" />
                {section.sectionType || `Step ${idx + 1}`}
              </CardTitle>
              <ConditionChips section={section} />
            </CardHeader>

            <CardContent className="p-0">
              <div className="flex flex-col lg:flex-row">
                {/* 反应式区域 */}
                {hasScheme && (
                  <div
                    className={`bg-dot-pattern dark:bg-zinc-950/80 ${
                      hasDescriptions
                        ? "lg:w-[45%] xl:w-2/5 border-b lg:border-b-0 lg:border-r border-muted/60"
                        : "w-full"
                    }`}
                  >
                    {validReactions.map((rxn: any, rIdx: number) => (
                      <div
                        key={rIdx}
                        className="w-full h-[260px] relative flex items-center justify-center"
                      >
                        <Viewer value={rxn.value} />
                      </div>
                    ))}
                  </div>
                )}

                {/* 描述区域 */}
                {hasDescriptions && (
                  <div className="flex-1 min-w-0 px-6 py-5 space-y-3">
                    {descriptions.map((desc: any, dIdx: number) => (
                      <div
                        key={dIdx}
                        className="text-sm leading-relaxed bg-muted/20 p-4 rounded-lg"
                      >
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground text-sm break-words"
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(desc.description),
                          }}
                        />
                        {desc.refPageNo && (
                          <div className="mt-2 text-xs font-mono text-primary/80 bg-primary/5 inline-block px-2 py-0.5 rounded">
                            Ref: {desc.refPageNo}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 既无反应式也无描述时的占位 */}
                {!hasScheme && !hasDescriptions && (
                  <div className="w-full bg-dot-pattern dark:bg-zinc-950/80">
                    <div className="w-full h-[150px] flex items-center justify-center">
                      <div className="text-muted-foreground flex flex-col items-center">
                        <FileText className="w-8 h-8 opacity-20 mb-2" />
                        <span className="text-sm">暂无内容</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
