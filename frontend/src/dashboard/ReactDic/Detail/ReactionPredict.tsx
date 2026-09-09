"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FlaskConical,
  Play,
  Loader2,
  AlertCircle,
  Beaker,
  ArrowRight,
  Atom,
} from "lucide-react";
import Viewer from "@/components/kekule-react/viewer";
import { KekuleChemWidgetRef } from "@/components/kekule-react/kekule-react";
import { predictProducts } from "@/lib/rdkit";
import { molBlockToSmiles } from "@/lib/rdkit-wasm";
import { Component } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/src/i18n/language-provider";

interface ReactionPredictProps {
  reaction: any;
}

function buildReactionSmarts(reaction: any): string[] {
  if (!reaction?.patterns || reaction.patterns.length === 0) return [];

  return reaction.patterns.map((pattern: any) => {
    const reactants =
      pattern.molecules
        ?.filter((m: any) => m.role === "反应物")
        .map((m: any) => m.smarts)
        .filter(Boolean) || [];

    const reagents =
      pattern.molecules
        ?.filter((m: any) => m.role === "反应试剂")
        .map((m: any) => m.smarts)
        .filter(Boolean) || [];

    const products =
      pattern.molecules
        ?.filter((m: any) => m.role === "产物")
        .map((m: any) => m.smarts)
        .filter(Boolean) || [];

    const reactantStr = reactants.join(".");
    const reagentStr = reagents.join(".");
    const productStr = products.join(".");

    return `${reactantStr}>${reagentStr}>${productStr}`;
  });
}

export default function ReactionPredict({ reaction }: ReactionPredictProps) {
  const { t } = useI18n();
  const viewerRefs = useRef<Map<string, KekuleChemWidgetRef>>(new Map());
  const [isPredicting, setIsPredicting] = useState(false);
  const [productMolBlocks, setProductMolBlocks] = useState<string[][]>([]);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [unmatched, setUnmatched] = useState<number[]>([]);
  const [hasResult, setHasResult] = useState(false);
  const [selectedPatternIdx, setSelectedPatternIdx] = useState(0);

  const reactionSmartsList = buildReactionSmarts(reaction);

  // Derive reactant count directly from the current pattern
  const currentPattern = reaction.patterns?.[selectedPatternIdx];
  const reactantCount =
    currentPattern?.molecules?.filter((m: any) => m.role === "反应物")
      ?.length || 1;

  // Reset prediction results when switching patterns
  useEffect(() => {
    setError(null);
    setDiagnostics([]);
    setUnmatched([]);
    setProductMolBlocks([]);
    setHasResult(false);
  }, [selectedPatternIdx]);

  const handlePredict = useCallback(async () => {
    setError(null);
    setDiagnostics([]);
    setUnmatched([]);
    setProductMolBlocks([]);
    setHasResult(false);

    try {
      const smilesList: string[] = [];

      for (let i = 0; i < reactantCount; i++) {
        const refKey = `${selectedPatternIdx}-${i}`;
        const ref = viewerRefs.current.get(refKey);
        if (!ref) {
          setError(t("rp.errEditor").replace("{n}", String(i + 1)));
          return;
        }

        // 走 molblock -> RDKit 转 SMILES：Kekule 自带的 SMILES 导出会
        // 丢失氢计数（NH2- 会被导成 [N-]），导致后端模板匹配失败
        const molBlock = ref.exportToMolBlock?.();
        const smiles = molBlock ? await molBlockToSmiles(molBlock) : null;
        if (!smiles) {
          setError(
            t("rp.errDraw").replace("{n}", String(i + 1)),
          );
          setUnmatched([i]);
          return;
        }
        smilesList.push(smiles);
      }

      const reactionSmarts = reactionSmartsList[selectedPatternIdx];
      if (!reactionSmarts) {
        setError(t("rp.errNoSmarts"));
        return;
      }

      setIsPredicting(true);

      console.log("Reaction SMARTS:", reactionSmarts);
      console.log("Reactant SMILES:", smilesList);

      const result = await predictProducts(reactionSmarts, smilesList);

      if (result.success && result.data) {
        setDiagnostics(result.data.diagnostics ?? []);

        if (result.data.productSets && result.data.productSets.length > 0) {
          setProductMolBlocks(result.data.productSets);
          setHasResult(true);
        } else {
          setUnmatched(result.data.unmatchedReactants ?? []);
          setError(
            result.data.error ||
              t("rp.errInfer"),
          );
        }
      } else {
        setDiagnostics(result.data?.diagnostics ?? []);
        setUnmatched(result.data?.unmatchedReactants ?? []);
        setError(result.error || t("rp.errFailed"));
      }
    } catch (err: any) {
      console.error("Prediction failed:", err);
      setError(err.message || t("rp.errGeneric"));
    } finally {
      setIsPredicting(false);
    }
  }, [reactionSmartsList, selectedPatternIdx, reactantCount]);

  if (reactionSmartsList.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden shadow-md border-muted/60 transition-all hover:shadow-lg pt-0 pb-5">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b pb-4 pt-5 px-6">
        <CardTitle className="text-lg flex items-center gap-2 font-bold">
          <FlaskConical className="w-5 h-5 text-primary" />
          {t("rp.title")}
        </CardTitle>
        <p className="text-muted-foreground text-sm mt-1">
          {t("rp.subtitle")}
          {reactantCount > 0 && (
            <span className="text-primary font-medium ml-1">
              {t("rp.requires").replace("{count}", String(reactantCount))}
            </span>
          )}
        </p>
      </CardHeader>

      <CardContent className=" space-y-5">
        {/* Pattern 选择 */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          {reactionSmartsList.length > 1 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                {t("rp.selectPattern")}
              </label>
              <div className="flex flex-wrap gap-2">
                {reaction.patterns.map((pattern: any, idx: number) => (
                  <Badge
                    key={pattern.id || idx}
                    variant={selectedPatternIdx === idx ? "default" : "outline"}
                    className={`cursor-pointer transition-all text-xs px-2.5 py-1 ${
                      selectedPatternIdx === idx
                        ? "shadow-sm"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedPatternIdx(idx)}
                  >
                    {pattern.name || `Pattern ${idx + 1}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Involved Molecules — 当前选中 pattern 的分子 */}
          {currentPattern?.molecules?.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Atom className="w-3.5 h-3.5" />
                {t("rp.roles")}
              </label>
              <div className="flex flex-wrap gap-2">
                {currentPattern.molecules.map((mol: any, mIdx: number) => (
                  <div key={mol.id || mIdx}>
                    <Badge
                      variant="secondary"
                      className="text-[13px] px-1.5 py-0"
                    >
                      <Component />
                      {mol.name || "—"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Reactants Input — Compact Viewer with Edit button */}
        <div className="space-y-3">
          <label className="text-sm font-semibold flex items-center gap-2">
            <Beaker className="w-4 h-4 text-primary/80" />
            {t("rp.reactants")} ({reactantCount})
          </label>

          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${Math.min(reactantCount, 3)}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: reactantCount }).map((_, idx) => {
              const refKey = `${selectedPatternIdx}-${idx}`;
              const isUnmatched = unmatched.includes(idx);
              return (
                <div key={refKey}>
                  <div
                    className={`text-xs font-medium mb-1.5 pl-1 ${
                      isUnmatched ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {t("rp.reactantN").replace("{n}", String(idx + 1))}
                    {isUnmatched && t("rp.unmatched")}
                  </div>
                  <div
                    className={`w-full h-[200px] rounded-lg overflow-hidden border bg-background ${
                      isUnmatched
                        ? "border-destructive ring-2 ring-destructive/40"
                        : "border-muted/60"
                    }`}
                  >
                    <Viewer
                      ref={(node) => {
                        if (node) {
                          viewerRefs.current.set(refKey, node);
                        } else {
                          viewerRefs.current.delete(refKey);
                        }
                      }}
                      className="w-full h-full"
                      enableEdit={true}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Predict Button */}
        <div className="flex justify-center p-1">
          <Button
            onClick={handlePredict}
            disabled={isPredicting}
            size="lg"
            className="px-8 shadow-md gap-2"
          >
            {isPredicting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t("rp.predicting")}
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                {t("rp.predict")}
              </>
            )}
          </Button>
        </div>

        {/* Diagnostics */}
        {diagnostics.length > 0 && (
          <div className="space-y-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/50 dark:border-amber-900 dark:text-amber-200">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              {t("rp.diagnostics")}
            </p>
            <ul className="list-disc list-inside space-y-1">
              {diagnostics.map((d, i) => (
                <li key={i} className="text-sm">
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Products */}
        {hasResult && productMolBlocks.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-base font-semibold flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-primary" />
              Predicted Products
              <Badge variant="secondary" className="ml-1 text-xs">
                {productMolBlocks.length} set(s)
              </Badge>
            </h4>

            <div className="space-y-4">
              {productMolBlocks.map((productSet, setIdx) => (
                <div key={setIdx} className="space-y-2">
                  {productMolBlocks.length > 1 && (
                    <p className="text-xs text-muted-foreground font-medium">
                      {t("rp.productSet")} {setIdx + 1}
                    </p>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    {productSet.map((molBlock, molIdx) => (
                      <div
                        key={molIdx}
                        className="rounded-lg border border-muted/50 bg-muted/10 overflow-hidden hover:border-primary/30 transition-colors shadow-sm"
                      >
                        <div className="p-1.5 bg-muted/20 border-b">
                          <p className="text-xs text-muted-foreground font-medium text-center">
                            {t("rp.product")} {molIdx + 1}
                          </p>
                        </div>
                        <div className="h-[180px] p-1">
                          <Viewer value={molBlock} className="w-full h-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
