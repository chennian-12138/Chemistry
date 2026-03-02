"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface HeaderProps {
  reaction: any;
  onBack: () => void;
}

export default function Header({ reaction, onBack }: HeaderProps) {
  return (
    <div className="space-y-6 mb-12">
      <Button
        variant="ghost"
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground pl-0 -ml-2 transition-colors duration-300"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        <span className="text-base">Back to Search</span>
      </Button>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            {reaction.name}
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary uppercase tracking-widest text-xs px-3 py-1 font-semibold"
            >
              {reaction.mechanismType || "Unknown Mechanism"}
            </Badge>
            {reaction.tags?.map((tag: string, i: number) => (
              <Badge
                key={i}
                variant="outline"
                className="text-muted-foreground text-xs px-3 py-1 bg-background"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {reaction.author && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/40 px-5 py-2.5 rounded-full border shadow-sm shrink-0">
            <span className="font-medium text-foreground">Contributed by:</span>
            <span className="flex items-center gap-2 font-medium">
              {reaction.author.name || "Anonymous"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
