"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  CheckCircle2,
  Component,
} from "lucide-react";
import Viewer from "@/components/kekule-react/viewer";
import { KekuleChemWidgetRef } from "@/components/kekule-react/kekule-react";
import { predictProducts } from "@/lib/rdkit";
import { Separator } from "@/components/ui/separator";

interface SmartsPattern {
  name: string;
  patternReactants: { smarts: string; name: string; role: string }[];
  patternRegents: { smarts: string; name: string; role: string }[];
  patternProducts: { smarts: string; name: string; role: string }[];
}

interface ReactionPredictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pattern: SmartsPattern;
  onValidate: (success: boolean) => void;
}

function buildReactionSmartsFromPattern(pattern: SmartsPattern): string {
  const reactants = pattern.patternReactants
    .map((m) => m.smarts)
    .filter(Boolean);
  const reagents = pattern.patternRegents
    .map((m) => m.smarts)
    .filter(Boolean);
  const products = pattern.patternProducts
    .map((m) => m.smarts)
    .filter(Boolean);

  return `${reactants.join(".")}>${reagents.join(".")}>${products.join(".")}`;
}

export default function ReactionPredictDialog({
  open,
  onOpenChange,
  pattern,
  onValidate,
}: ReactionPredictDialogProps) {
  const viewerRefs = useRef<Map<string, KekuleChemWidgetRef>>(new Map());
  const [isPredicting, setIsPredicting] = useState(false);
  const [productMolBlocks, setProductMolBlocks] = useState<string[][]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasResult, setHasResult] = useState(false);
  const [validated, setValidated] = useState(false);

  const reactionSmarts = buildReactionSmartsFromPattern(pattern);
  const reactantCount = pattern.patternReactants.filter(
    (r) => r.smarts,
  ).length;

  // All molecules for display
  const allMolecules = [
    ...pattern.patternReactants.map((m) => ({
      ...m,
      roleLabel: "反应物",
    })),
    ...pattern.patternRegents.map((m) => ({
      ...m,
      roleLabel: "试剂",
    })),
    ...pattern.patternProducts.map((m) => ({
      ...m,
      roleLabel: "产物",
    })),
  ];

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setError(null);
      setProductMolBlocks([]);
      setHasResult(false);
      setValidated(false);
    }
  }, [open]);

  const handlePredict = useCallback(async () => {
    setError(null);
    setProductMolBlocks([]);
    setHasResult(false);

    try {
      const smilesList: string[] = [];

      for (let i = 0; i < reactantCount; i++) {
        const refKey = `predict-${i}`;
        const ref = viewerRefs.current.get(refKey);
        if (!ref) {
          setError(`反应物 ${i + 1} 的编辑器未就绪`);
          return;
        }

        const smiles = ref.exportToSmiles?.();
        if (!smiles) {
          setError(
            `请在反应物 ${i + 1} 中绘制分子结构（点击工具栏编辑按钮绘制）`,
          );
          return;
        }
        smilesList.push(smiles);
      }

      if (!reactionSmarts || reactionSmarts === ">>") {
        setError("该反应模式无可用的 SMARTS 表达式");
        return;
      }

      setIsPredicting(true);

      const result = await predictProducts(reactionSmarts, smilesList);

      if (result.success && result.data?.productSets) {
        setProductMolBlocks(result.data.productSets);
        setHasResult(true);

        if (result.data.productSets.length === 0) {
          setError("未能推断出产物，请检查反应物是否匹配该反应模式");
        } else {
          // Prediction succeeded with products!
          setValidated(true);
          onValidate(true);
        }
      } else {
        setError(result.error || "预测失败，请检查反应物是否正确");
      }
    } catch (err: unknown) {
      console.error("Prediction failed:", err);
      setError(err instanceof Error ? err.message : "预测过程中发生错误");
    } finally {
      setIsPredicting(false);
    }
  }, [reactionSmarts, reactantCount, onValidate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          aria-hidden="true"
        />
      )}
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FlaskConical className="w-5 h-5 text-primary" />
            反应预测校验
            {validated && (
              <Badge
                variant="default"
                className="bg-green-500 text-white ml-2"
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                校验通过
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            绘制反应物分子，验证 SMARTS 模式是否能正确预测出产物
            {reactantCount > 0 && (
              <span className="text-primary font-medium ml-1">
                （该反应需要 {reactantCount} 个反应物）
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Involved Molecules Summary */}
          {allMolecules.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Atom className="w-3.5 h-3.5" />
                参与分子
              </label>
              <div className="flex flex-wrap gap-2">
                {allMolecules.map((mol, mIdx) => (
                  <Badge
                    key={mIdx}
                    variant="secondary"
                    className="text-[13px] px-1.5 py-0"
                  >
                    <Component className="w-3 h-3 mr-1" />
                    {mol.name || mol.smarts || "—"}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Reactants Input */}
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
                const refKey = `predict-${idx}`;
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
                预测产物
                <Badge variant="secondary" className="ml-1 text-xs">
                  {productMolBlocks.length} 组
                </Badge>
              </h4>

              <div className="space-y-4">
                {productMolBlocks.map((productSet, setIdx) => (
                  <div key={setIdx} className="space-y-2">
                    {productMolBlocks.length > 1 && (
                      <p className="text-xs text-muted-foreground font-medium">
                        第 {setIdx + 1} 组
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
                              产物 {molIdx + 1}
                            </p>
                          </div>
                          <div className="h-[180px] p-1">
                            <Viewer
                              value={molBlock}
                              className="w-full h-full"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
