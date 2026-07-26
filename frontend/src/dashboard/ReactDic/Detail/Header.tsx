"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";

interface HeaderProps {
  reaction: any;
}

export default function Header({ reaction }: HeaderProps) {
  return (
    <div className="space-y-5 mb-8">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
            {reaction.name}
          </h1>

          {/* 类型 + 标签 */}
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
          </div>
        </div>

        {(reaction.author || reaction.createdAt) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 px-4 py-2 rounded-full border shadow-sm shrink-0">
            {reaction.author && (
              <>
                <span className="font-medium text-foreground">by</span>
                <span className="font-medium">
                  {reaction.author.name || "Anonymous"}
                </span>
              </>
            )}
            {reaction.author && reaction.createdAt && (
              <span className="text-muted-foreground/50">·</span>
            )}
            {reaction.createdAt && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                {format(new Date(reaction.createdAt), "yyyy-MM-dd")}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
