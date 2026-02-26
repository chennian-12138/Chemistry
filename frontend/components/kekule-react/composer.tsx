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
    // const [chemObj, setChemObj] = useState(null);
    const widgetRef = useRef<KekuleChemWidgetRef>(null);
    const lastExportedJsonRef = useRef<string>("");
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const [initialChemObj] = useState(() => {
      if (!value) return null;
      // 注意：这里只是初始化，不依赖 Kekule 模块
      return value; // 传递字符串，在内部解析
    });

    const handleChange = useCallback(
      (newObj: unknown) => {
        if (!onChange || !widgetRef.current) return;

        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          let exportValue:string
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

    // 导入外部值
    // useEffect(() => {
    //   const loadChemObj = async () => {
    //     if (!value) {
    //       setChemObj(null);
    //       return;
    //     }

    //     try {
    //       const { Kekule } = await import("kekule");
    //       let obj;

    //       if (value.startsWith("{")) {
    //         obj = Kekule.IO.loadFormatData(value, "Kekule-JSON");
    //       } else {
    //         obj = Kekule.IO.loadFormatData(value, "smi");
    //       }

    //       setChemObj(obj);
    //     } catch (e) {
    //       console.error("加载化学对象失败:", e);
    //     }
    //   };

    //   loadChemObj();
    // }, [value]);

    // const handleChange = () => {
    //   if (onChange && widgetRef.current) {
    //     const json = widgetRef.current.exportToKekuleJson();
    //     onChange(json || "");
    //   }
    // };

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
        chemObj={initialChemObj}
        predefinedSetting="reactionEdit"
        onChange={handleChange}
        className={className}
        syncExternalChemObj={false}
      />
    );
  },
);

Composer.displayName = "Composer";
export default Composer;
