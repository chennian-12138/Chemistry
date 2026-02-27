"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Composer from "@/components/kekule-react/composer";
import { KekuleChemWidgetRef } from "@/components/kekule-react/kekule-react";
import { matchSmart } from "@/lib/rdkit";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface SmartValidatorDialogProps {
  Open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  smarts: string;
  onValidate?: (success: boolean) => void;
}

interface MatchResult {
  smarts: string;
  match_count: number;
  matches: number[][];
  atom_indices: number[];
  matched: boolean;
  error?: string;
}

export default function SmartValidatorDialog(props: SmartValidatorDialogProps) {
  const [molBlock, setMolBlock] = useState<string>("");
  const [isValid, setIsValid] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const composerRef = useRef<KekuleChemWidgetRef>(null);

  const handleValidate = async () => {
    if (!molBlock) {
      setResult({ success: false, message: "请先绘制分子" });
      return;
    }
    if (!props.smarts) {
      setResult({ success: false, message: "请先输入SMARTS模式" });
      return;
    }

    console.log("SMARTS模式:", props.smarts);
    console.log("分子MOLBLOCK:", molBlock);

    setIsValid(true);
    setResult(null);

    try {
      const response = await matchSmart(props.smarts, molBlock);
      console.log("服务器响应:", response);

      if (response.success && response) {
        const matchResult = response.data as MatchResult;
        console.log("匹配结果:", matchResult);

        if (matchResult.matched) {
          setResult({
            success: true,
            message: `SMARTS模式匹配成功，共匹配${matchResult.match_count}次`,
          });
          if (matchResult.atom_indices?.length) {
            composerRef.current?.highlightAtoms(matchResult.atom_indices);
          }
          props.onValidate?.(true);
        } else {
          setResult({ success: false, message: "SMARTS模式未匹配到任何原子" });
          props.onValidate?.(false);
        }
      }
    } catch (error) {
      console.error("SMARTS匹配错误:", error);
      setResult({
        success: false,
        message: "匹配过程中发生错误，请检查SMARTS模式是否正确",
      });
      props.onValidate?.(false);
    } finally {
      setIsValid(false);
    }
  };
  const handleClose = () => {
    setResult(null);
    setMolBlock("");
    props.onOpenChange(false);
  };

  return (
    <Dialog open={props.Open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>验证SMARTS模式</DialogTitle>
          <DialogDescription>
            请在下面绘制一个符合您刚才书写SMARTS模式的分子，随后点击验证按钮，用以判断该SMART是否正确。
          </DialogDescription>
        </DialogHeader>
        {/* Composer 组件 - 通过 onChange 获取分子数据 */}
        <div className="space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <Composer
              ref={composerRef}
              exportFormat="molblock"
              value={molBlock}
              onChange={(block) => {
                console.log("Composer onChange:", block); // ← 添加日志
                setMolBlock(block || "");
              }}
              className="w-full h-full"
            />
          </div>

          {result && (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg ${
                result.success
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {result.success ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <span>{result.message}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={handleClose}>
              关闭
            </Button>
          </DialogClose>
          <Button onClick={handleValidate} disabled={isValid}>
            {isValid && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            验证匹配
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
