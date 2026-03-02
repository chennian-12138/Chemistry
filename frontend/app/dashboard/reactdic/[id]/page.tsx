"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getReactionById } from "@/lib/api";
import Viewer from "@/components/kekule-react/viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Beaker,
  Clock,
  Thermometer,
  Droplets,
  Activity,
} from "lucide-react";

export default function ReactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [reaction, setReaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      try {
        const res = await getReactionById(id);
        if (res.success) {
          setReaction(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch reaction details", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 space-y-8 max-w-5xl mx-auto animate-pulse">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-12 w-3/4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-[400px] w-full rounded-xl" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-[300px] w-full" />
            <Skeleton className="h-[200px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!reaction) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <Beaker className="w-12 h-12 text-muted-foreground opacity-50 mb-4" />
        <h2 className="text-2xl font-semibold">Reaction Not Found</h2>
        <p className="text-muted-foreground mt-2 mb-6">
          The reaction you are looking for does not exist or has been removed.
        </p>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  // Find the primary visual structure (often the first reaction phase)
  const primaryStructure = reaction.sections?.[0]?.reactions?.[0]?.value;

  return (
    <div className="flex-1 w-full space-y-8 pt-6 pb-20 px-4 md:px-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      {/* Top Navigation & Title */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground pl-0 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Search
        </Button>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              {reaction.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary uppercase tracking-wider text-[10px]"
              >
                {reaction.mechanismType || "Unknown Mechanism"}
              </Badge>
              {reaction.tags?.map((tag: string, i: number) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-muted-foreground"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {reaction.author && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/30 px-4 py-2 rounded-full border">
              <span className="font-medium text-foreground">
                Contributed by:
              </span>
              <span className="flex items-center gap-2">
                {reaction.author.name || "Anonymous"}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area (Structures & Descriptions) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Reaction Viewer */}
          <Card className="overflow-hidden shadow-sm border-muted">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Beaker className="w-5 h-5 text-primary" />
                Reaction Scheme
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 bg-dot-pattern dark:bg-zinc-950">
              <div className="w-full h-[350px] md:h-[450px] relative flex items-center justify-center">
                {primaryStructure ? (
                  <Viewer value={primaryStructure} />
                ) : (
                  <div className="text-muted-foreground flex flex-col items-center">
                    <Beaker className="w-10 h-10 opacity-20 mb-2" />
                    <span>No structural schematic available</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* General Description / References */}
          {reaction.sections?.map((section: any, idx: number) => (
            <Card key={section.id || idx} className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">
                  Phase {idx + 1}: {section.sectionType || "Details"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {section.descriptions?.map((desc: any, dIdx: number) => (
                  <div
                    key={dIdx}
                    className="text-muted-foreground leading-relaxed text-sm md:text-base bg-muted/20 p-4 rounded-lg border border-transparent hover:border-border transition-colors"
                  >
                    {desc.description}
                    {desc.refPageNo && (
                      <div className="mt-2 text-xs font-mono text-primary/70">
                        Ref: {desc.refPageNo}
                      </div>
                    )}
                  </div>
                ))}
                {(!section.descriptions ||
                  section.descriptions.length === 0) && (
                  <p className="text-muted-foreground italic text-sm">
                    No description provided for this phase.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sidebar Info (Conditions, Patterns) */}
        <div className="space-y-8">
          {/* Reaction Conditions */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg">Conditions</CardTitle>
              <CardDescription>Reaction environment parameters</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {reaction.sections?.[0] ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Thermometer className="w-3.5 h-3.5" /> Temp
                    </span>
                    <span className="font-medium">
                      {reaction.sections[0].temperature || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5" /> Solvent
                    </span>
                    <span className="font-medium">
                      {reaction.sections[0].solvent || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Time
                    </span>
                    <span className="font-medium">
                      {reaction.sections[0].duration || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" /> Pressure
                    </span>
                    <span className="font-medium">
                      {reaction.sections[0].pressure || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      pH State
                    </span>
                    <span className="font-medium">
                      {reaction.sections[0].acidityBasicity || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      Concentration
                    </span>
                    <span className="font-medium">
                      {reaction.sections[0].concentration || "-"}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground italic text-sm">
                  No specific conditions recorded.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Molecule Roles */}
          {reaction.patterns && reaction.patterns.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg">Involved Molecules</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-6">
                {reaction.patterns.map((pattern: any, pIdx: number) => (
                  <div key={pattern.id || pIdx} className="space-y-3">
                    <h4 className="text-sm font-semibold border-l-2 border-primary pl-2">
                      {pattern.name || `Pattern ${pIdx + 1}`}
                    </h4>
                    <div className="flex flex-col gap-2">
                      {pattern.molecules?.map((mol: any, mIdx: number) => (
                        <div
                          key={mol.id || mIdx}
                          className="flex justify-between items-center text-sm p-2 rounded bg-muted/30"
                        >
                          <span className="font-medium">{mol.name}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {mol.role}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
