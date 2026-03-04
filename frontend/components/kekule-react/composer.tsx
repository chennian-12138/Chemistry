"use client";
import { forwardRef, useRef, useEffect, useState, useCallback } from "react";
import KekuleChemWidget, {
  KekuleChemWidgetRef,
} from "@/components/kekule-react/kekule-react";

interface ComposerProps {
  value?: string; // SMILES 或 JSON
  onChange?: (value: string) => void;
  className?: string;
  exportFormat?: "json" | "smiles" | "molblock";
}

const Composer = forwardRef<KekuleChemWidgetRef, ComposerProps>(
  ({ value, onChange, className, exportFormat = "json" }, ref) => {
    const widgetRef = useRef<KekuleChemWidgetRef>(null);
    const lastExportedJsonRef = useRef<string>("");
    const lastImportedValueRef = useRef<string | undefined>(undefined);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const [chemObj, setChemObj] = useState(null);

    // 监听外部 value 变化（例如 methods.reset），解析后更新 chemObj
    useEffect(() => {
      // 跳过：没有值
      if (!value) return;
      // 跳过：与上次导入的值相同（未变化）
      if (value === lastImportedValueRef.current) return;
      // 跳过：与自身最近一次 onChange 导出的值相同（防反馈循环）
      if (value === lastExportedJsonRef.current) return;

      lastImportedValueRef.current = value;

      const loadChemObj = async () => {
        try {
          const { Kekule } = await import("kekule");
          let obj;

          if (value.startsWith("{")) {
            obj = Kekule.IO.loadFormatData(value, "Kekule-JSON");
          } else if (value.includes("M  END")) {
            obj = Kekule.IO.loadFormatData(value, "mol");
          } else {
            obj = Kekule.IO.loadFormatData(value, "smi");
          }

          if (obj) {
            setChemObj(obj);
          }
        } catch (e) {
          console.error("Composer 加载化学对象失败:", e);
        }
      };

      loadChemObj();
    }, [value]);

    const handleChange = useCallback(
      (newObj: unknown) => {
        if (!onChange || !widgetRef.current) return;

        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          let exportValue: string;
          switch (exportFormat) {
            case "smiles":
              exportValue = widgetRef.current?.exportToSmiles?.();
              break;
            case "molblock":
              exportValue = widgetRef.current?.exportToMolBlock?.();
              break;
            default:
              exportValue = widgetRef.current?.exportToKekuleJson();
          }

          if (exportValue && exportValue !== lastExportedJsonRef.current) {
            lastExportedJsonRef.current = exportValue;
            onChange(exportValue);
          }
        }, 300);
      },
      [onChange, exportFormat],
    );

    useEffect(() => {
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }, []);

    return (
      <KekuleChemWidget
        ref={(node) => {
          widgetRef.current = node;
          if (typeof ref === "function") {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        type="composer"
        chemObj={chemObj}
        predefinedSetting="reactionEdit"
        onChange={handleChange}
        className={className}
        syncExternalChemObj={true}
      />
    );
  },
);

Composer.displayName = "Composer";
export default Composer;
