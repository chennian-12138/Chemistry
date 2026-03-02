"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Clock,
  Thermometer,
  Droplets,
  Activity,
  Beaker,
  Settings2,
  Atom,
} from "lucide-react";

interface SidebarProps {
  reaction: any;
}

export default function Sidebar({ reaction }: SidebarProps) {
  const section = reaction.sections?.[0];

  // Helper function to render a condition only if it exists and is not "-"
  const renderCondition = (
    icon: React.ReactNode,
    label: string,
    value: string | undefined | null,
  ) => {
    if (
      !value ||
      value.trim() === "-" ||
      value.trim() === "N/A" ||
      value.trim() === ""
    ) {
      return null;
    }

    return (
      <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-muted/30 border border-muted/50 transition-colors hover:bg-muted/50">
        <span className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
          {icon} {label}
        </span>
        <span className="font-semibold text-foreground pl-6 text-base">
          {value}
        </span>
      </div>
    );
  };

  const hasConditions =
    section &&
    ((section.temperature && section.temperature !== "-") ||
      (section.solvent && section.solvent !== "-") ||
      (section.duration && section.duration !== "-") ||
      (section.pressure && section.pressure !== "-") ||
      (section.acidityBasicity && section.acidityBasicity !== "-") ||
      (section.concentration && section.concentration !== "-"));

  return (
    <div className="space-y-8">
      {/* Reaction Conditions */}
      <Card className="shadow-md border-muted/60 overflow-hidden">
        <CardHeader className="bg-muted/10 border-b px-6 py-5">
          <CardTitle className="text-xl flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            Reaction Conditions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {hasConditions ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
              {renderCondition(
                <Thermometer className="w-4 h-4 text-orange-500" />,
                "Temperature",
                section?.temperature,
              )}
              {renderCondition(
                <Droplets className="w-4 h-4 text-blue-500" />,
                "Solvent",
                section?.solvent,
              )}
              {renderCondition(
                <Clock className="w-4 h-4 text-green-500" />,
                "Time",
                section?.duration,
              )}
              {renderCondition(
                <Activity className="w-4 h-4 text-purple-500" />,
                "Pressure",
                section?.pressure,
              )}
              {renderCondition(
                <Beaker className="w-4 h-4 text-pink-500" />,
                "pH State",
                section?.acidityBasicity,
              )}
              {renderCondition(
                <Atom className="w-4 h-4 text-indigo-500" />,
                "Concentration",
                section?.concentration,
              )}
            </div>
          ) : (
            <p className="text-muted-foreground italic text-base text-center py-6 bg-muted/20 rounded-lg border border-dashed">
              No specific conditions recorded for this reaction.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Molecule Roles */}
      {reaction.patterns && reaction.patterns.length > 0 && (
        <Card className="shadow-md border-muted/60">
          <CardHeader className="bg-muted/10 border-b px-6 py-5">
            <CardTitle className="text-xl flex items-center gap-2">
              <Atom className="w-5 h-5 text-primary" />
              Involved Molecules
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {reaction.patterns.map((pattern: any, pIdx: number) => (
              <div key={pattern.id || pIdx} className="space-y-4">
                <h4 className="text-base font-semibold border-l-4 border-primary pl-3 bg-muted/20 py-1.5 pr-2 rounded-r-md">
                  {pattern.name || `Pattern ${pIdx + 1}`}
                </h4>
                <div className="flex flex-col gap-3 pl-1">
                  {pattern.molecules?.map((mol: any, mIdx: number) => (
                    <div
                      key={mol.id || mIdx}
                      className="flex justify-between items-center text-base p-3 rounded-lg border border-muted/50 bg-background hover:border-primary/30 transition-colors shadow-sm"
                    >
                      <span className="font-medium text-foreground">
                        {mol.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-xs px-2.5 py-1"
                      >
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
  );
}
