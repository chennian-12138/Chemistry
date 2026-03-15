/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { forwardRef, useRef, useEffect, useState } from "react";
import KekuleChemWidget, {
  KekuleChemWidgetRef,
} from "@/components/kekule-react/kekule-react";

interface ViewerProps {
  value?: string; // Kekule JSON 字符串
  onChange?: (value: string) => void;
  className?: string;
  enableEdit?: boolean;
}

const Viewer = forwardRef<KekuleChemWidgetRef, ViewerProps>(
  ({ value, onChange, className, enableEdit = false }, ref) => {
    const [chemObj, setChemObj] = useState(null);
    const widgetRef = useRef<KekuleChemWidgetRef>(null);
    const lastValueRef = useRef<string | undefined>(undefined);

    // 当外部 value 变化时，导入到 Viewer
    useEffect(() => {
      if (value === lastValueRef.current) {
        return;
      }
      lastValueRef.current = value;

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
          } else if (value.includes("M  END")) {
            obj = Kekule.IO.loadFormatData(value, "mol");
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
        type="viewer"
        chemObj={chemObj}
        predefinedSetting="reactionEdit"
        onChange={enableEdit ? handleChange : undefined}
        className={className}
        syncExternalChemObj={true}
        enableEdit={enableEdit}
        enableToolbar={enableEdit}
        allowEmpty={!enableEdit}
      />
    );
  },
);

Viewer.displayName = "Viewer";

export default Viewer;
