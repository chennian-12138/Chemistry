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
import { Component } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
  const viewerRefs = useRef<Map<string, KekuleChemWidgetRef>>(new Map());
  const [isPredicting, setIsPredicting] = useState(false);
  const [productMolBlocks, setProductMolBlocks] = useState<string[][]>([]);
  const [error, setError] = useState<string | null>(null);
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
    setProductMolBlocks([]);
    setHasResult(false);
  }, [selectedPatternIdx]);

  const handlePredict = useCallback(async () => {
    setError(null);
    setProductMolBlocks([]);
    setHasResult(false);

    try {
      const smilesList: string[] = [];

      for (let i = 0; i < reactantCount; i++) {
        const refKey = `${selectedPatternIdx}-${i}`;
        const ref = viewerRefs.current.get(refKey);
        if (!ref) {
          setError(`反应物 ${i + 1} 的编辑器未就绪`);
          return;
        }

        const smiles = ref.exportToSmiles?.();
        if (!smiles) {
          setError(`请在反应物 ${i + 1} 中绘制分子结构（点击工具栏编辑按钮绘制）`);
          return;
        }
        smilesList.push(smiles);
      }

      const reactionSmarts = reactionSmartsList[selectedPatternIdx];
      if (!reactionSmarts) {
        setError("该反应无可用的 SMARTS 模式");
        return;
      }

      setIsPredicting(true);

      console.log("Reaction SMARTS:", reactionSmarts);
      console.log("Reactant SMILES:", smilesList);

      const result = await predictProducts(reactionSmarts, smilesList);

      if (result.success && result.data?.productSets) {
        setProductMolBlocks(result.data.productSets);
        setHasResult(true);

        if (result.data.productSets.length === 0) {
          setError("未能推断出产物，请检查反应物是否匹配该反应模式");
        }
      } else {
        setError(result.error || "预测失败，请检查反应物是否正确");
      }
    } catch (err: any) {
      console.error("Prediction failed:", err);
      setError(err.message || "预测过程中发生错误");
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
          反应预测
        </CardTitle>
        <p className="text-muted-foreground text-sm mt-1">
          绘制反应物分子，预测该反应的产物
          {reactantCount > 0 && (
            <span className="text-primary font-medium ml-1">
              （该反应需要 {reactantCount} 个反应物）
            </span>
          )}
        </p>
      </CardHeader>

      <CardContent className=" space-y-5">
        {/* Pattern 选择 */}
        <div className="justify-between flex">
          {reactionSmartsList.length > 1 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                选择反应模式
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
                反应物 试剂 产物
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
            反应物 ({reactantCount})
          </label>

          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${Math.min(reactantCount, 3)}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: reactantCount }).map((_, idx) => {
              const refKey = `${selectedPatternIdx}-${idx}`;
              return (
                <div key={refKey}>
                  <div className="text-xs text-muted-foreground font-medium mb-1.5 pl-1">
                    反应物 {idx + 1}
                  </div>
                  <div className="w-full h-[200px] rounded-lg overflow-hidden border border-muted/60 bg-background">
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
                正在推断产物...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                预测产物
              </>
            )}
          </Button>
        </div>

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
                      Set {setIdx + 1}
                    </p>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {productSet.map((molBlock, molIdx) => (
                      <div
                        key={molIdx}
                        className="rounded-lg border border-muted/50 bg-muted/10 overflow-hidden hover:border-primary/30 transition-colors shadow-sm"
                      >
                        <div className="p-1.5 bg-muted/20 border-b">
                          <p className="text-xs text-muted-foreground font-medium text-center">
                            Product {molIdx + 1}
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
