"use client";

import React from "react";
import Viewer from "@/components/kekule-react/viewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Beaker } from "lucide-react";
import DOMPurify from "dompurify";

interface MainContentProps {
  reaction: any;
}

export default function MainContent({ reaction }: MainContentProps) {
  const sections = reaction.sections || [];

  return (
    <div className="space-y-6">
      {/* 所有 Section 横向排列在一行 */}
      <div
        className="grid gap-6"
        style={{
          gridTemplateColumns: `repeat(${Math.min(sections.length, 3)}, minmax(0, 1fr))`,
        }}
      >
        {sections.map((section: any, idx: number) => (
          <Card
            key={section.id || idx}
            className="overflow-hidden shadow-md border-muted/60"
          >
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 font-semibold">
                <Beaker className="w-4 h-4 text-primary" />
                {section.sectionType || `Step ${idx + 1}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* 反应式 */}
              {section.reactions?.map((rxn: any, rIdx: number) =>
                rxn.value ? (
                  <div
                    key={rIdx}
                    className="bg-dot-pattern dark:bg-zinc-950/80"
                  >
                    <div className="w-full h-[200px] relative flex items-center justify-center">
                      <Viewer value={rxn.value} />
                    </div>
                  </div>
                ) : null,
              )}

              {(!section.reactions ||
                section.reactions.every((r: any) => !r.value)) && (
                <div className="bg-dot-pattern dark:bg-zinc-950/80">
                  <div className="w-full h-[150px] flex items-center justify-center">
                    <div className="text-muted-foreground flex flex-col items-center">
                      <Beaker className="w-8 h-8 opacity-20 mb-2" />
                      <span className="text-sm">No schematic</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 描述 */}
              {section.descriptions?.length > 0 && (
                <div className="px-4 pb-4 pt-3 space-y-3">
                  {section.descriptions.map((desc: any, dIdx: number) => (
                    <div
                      key={dIdx}
                      className="text-muted-foreground text-sm leading-relaxed bg-muted/20 p-3 rounded-lg"
                    >
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground text-sm"
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
