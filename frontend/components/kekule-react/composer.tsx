// composer.tsx - 修改成这样
"use client";
import { forwardRef, useRef, useEffect, useState } from "react";
import KekuleChemWidget, {
  KekuleChemWidgetRef,
} from "@/components/kekule-react/kekule-react";

interface ComposerProps {
  value?: string; // SMILES 或 JSON
  onChange?: (value: string) => void;
  className?: string;
}

const Composer = forwardRef<KekuleChemWidgetRef, ComposerProps>(
  ({ value, onChange, className }, ref) => {
    const [chemObj, setChemObj] = useState(null);
    const widgetRef = useRef<KekuleChemWidgetRef>(null);

    // 导入外部值
    useEffect(() => {
      const loadChemObj = async () => {
        if (!value) {
          setChemObj(null);
          return;
        }

        try {
          const { Kekule } = await import("kekule");
          let obj;

          if (value.startsWith("{")) {
            obj = Kekule.IO.loadFormatData(value, "Kekule-JSON");
          } else {
            obj = Kekule.IO.loadFormatData(value, "smi");
          }

          setChemObj(obj);
        } catch (e) {
          console.error("加载化学对象失败:", e);
        }
      };

      loadChemObj();
    }, [value]);

    const handleChange = () => {
      if (onChange && widgetRef.current) {
        const json = widgetRef.current.exportToKekuleJson();
        onChange(json || "");
      }
    };

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
      />
    );
  },
);

Composer.displayName = "Composer";
export default Composer;
