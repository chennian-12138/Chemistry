"use client";

import React from "react";
import Viewer from "@/components/kekule-react/viewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Beaker, BookOpen } from "lucide-react";
import DOMPurify from "dompurify";

interface MainContentProps {
  reaction: any;
}

export default function MainContent({ reaction }: MainContentProps) {
  // Find the primary visual structure (often the first reaction phase)
  const primaryStructure = reaction.sections?.[0]?.reactions?.[0]?.value;

  return (
    <div className="lg:col-span-2 space-y-10">
      {/* Reaction Viewer */}
      <Card className="overflow-hidden shadow-md border-muted/60 transition-all hover:shadow-lg">
        <CardHeader className="bg-muted/20 border-b pb-5 pt-6 px-8">
          <CardTitle className="text-xl flex items-center gap-3 font-bold">
            <Beaker className="w-6 h-6 text-primary" />
            Reaction Scheme
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 bg-dot-pattern dark:bg-zinc-950/80">
          <div className="w-full h-[400px] md:h-[550px] relative flex items-center justify-center">
            {primaryStructure ? (
              <Viewer value={primaryStructure} />
            ) : (
              <div className="text-muted-foreground flex flex-col items-center">
                <Beaker className="w-12 h-12 opacity-20 mb-4" />
                <span className="text-lg">
                  No structural schematic available
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* General Description / References */}
      <div className="space-y-8">
        <h3 className="text-2xl font-bold tracking-tight border-b pb-4 flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-primary/80" />
          Experimental Procedure
        </h3>

        {reaction.sections?.map((section: any, idx: number) => (
          <Card key={section.id || idx} className="shadow-sm border-muted/50">
            <CardHeader className="bg-muted/10 px-6 py-5">
              <CardTitle className="text-lg text-foreground/90">
                Step {idx + 1}: {section.sectionType || "Process Details"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 px-6 pb-6 pt-4">
              {section.descriptions?.map((desc: any, dIdx: number) => (
                <div
                  key={dIdx}
                  className="text-muted-foreground leading-loose text-base bg-muted/20 p-5 rounded-xl border border-transparent transition-colors hover:border-border/60 hover:bg-muted/30"
                >
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-loose text-base"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(desc.description),
                    }}
                  />
                  {desc.refPageNo && (
                    <div className="mt-4 text-sm font-mono text-primary/80 bg-primary/5 inline-block px-3 py-1 rounded-md">
                      Ref: {desc.refPageNo}
                    </div>
                  )}
                </div>
              ))}
              {(!section.descriptions || section.descriptions.length === 0) && (
                <p className="text-muted-foreground italic text-base px-2">
                  No detailed description provided for this phase.
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
