/* eslint-disable @typescript-eslint/no-explicit-any */
// components/kekule/KekuleChemWidget.tsx
"use client";

import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";

export type WidgetType = "viewer" | "composer" | "periodicTable";

export interface KekuleChemWidgetProps {
  type: WidgetType;
  chemObj?: any;
  onChange?: (newObj: any) => void;
  onElementSelect?: (element: any) => void;
  width?: string;
  height?: string;
  className?: string; // 支持 Tailwind
  predefinedSetting?: string;
  enableToolbar?: boolean;
  allowEmpty?: boolean; // 是否允许空状态（无分子）
}

export interface KekuleChemWidgetRef {
  getWidget: () => any;
  getChemObj: () => any;
  setChemObj: (obj: any) => void;
  createEmptyMolecule: () => void;
  exportToKekuleJson: () => string | null;
  importFromKekuleJson: (json: string) => void;
  exportToSmiles: () => string | null;
  importFromSmiles: (smiles: string) => void;
}

const KekuleChemWidget = forwardRef<KekuleChemWidgetRef, KekuleChemWidgetProps>(
  (
    {
      type,
      chemObj: initialChemObj,
      onChange,
      onElementSelect,
      width,
      height,
      className = "",
      predefinedSetting = "basic",
      enableToolbar = true,
      allowEmpty = false,
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetRef = useRef<any>(null);
    const [isReady, setIsReady] = useState(false);
    const [KekuleModule, setKekuleModule] = useState<any>(null);
    const [hasChemObj, setHasChemObj] = useState(false);

    useEffect(() => {
      if (typeof window === "undefined") return;

      let widget: any;
      let isMounted = true;

      const init = async () => {
        try {
          const { Kekule } = await import("kekule");
          await import("kekule/theme/default");

          if (!isMounted || !containerRef.current) return;

          setKekuleModule(Kekule);

          switch (type) {
            case "viewer":
              widget = new Kekule.ChemWidget.Viewer(containerRef.current);
              widget
                .setDimension("100%", "100%") // 使用百分比填充容器
                .setEnableToolbar(enableToolbar)
                .setEnableDirectInteraction(true)
                .setEnableEdit(true)
                .setPredefinedSetting(predefinedSetting);

              widget.on("load", (e: any) => {
                if (e.target === widget) {
                  const newObj = widget.getChemObj();
                  setHasChemObj(!!newObj);
                  onChange?.(newObj); // 触发外部回调
                }
              });

              // 也监听清空事件
              widget.on("clear", () => {
                setHasChemObj(false);
                onChange?.(null);
              });
              break;

            case "composer":
              widget = new Kekule.Editor.Composer(containerRef.current);
              widget
                .setDimension("100%", "100%")
                .setPredefinedSetting(predefinedSetting || "fullFunc")
                .setEnableOperHistory(true);

              widget.on("operChange", () => {
                const newObj = widget.getChemObj();
                setHasChemObj(!!newObj);
                onChange?.(newObj);
              });
              break;

            case "periodicTable":
              widget = new Kekule.ChemWidget.PeriodicTable(
                containerRef.current,
              );
              widget.setDimension("100%", "100%");

              widget.on("elemSelect", (event: any) => {
                const element = event.element;
                onElementSelect?.(element);
              });
              break;
          }

          widgetRef.current = widget;

          // 处理初始分子
          if (initialChemObj) {
            widget.setChemObj(initialChemObj);
            setHasChemObj(true);
          } else if (!allowEmpty && type !== "periodicTable") {
            // 自动创建空分子，使编辑按钮可用
            const emptyMol = new Kekule.Molecule();
            widget.setChemObj(emptyMol);
            setHasChemObj(true);
          }

          setIsReady(true);
        } catch (error) {
          console.error("Kekule widget initialization failed:", error);
        }
      };

      init();

      return () => {
        isMounted = false;
        widget?.finalize?.();
      };
    }, [type]);

    // 同步外部 chemObj 变化
    useEffect(() => {
      if (widgetRef.current && isReady) {
        if (initialChemObj) {
          const currentObj = widgetRef.current.getChemObj();
          if (currentObj !== initialChemObj) {
            widgetRef.current.setChemObj(initialChemObj);
            setHasChemObj(true);
          }
        }
      }
    }, [initialChemObj, isReady]);

    useImperativeHandle(ref, () => ({
      getWidget: () => widgetRef.current,
      getChemObj: () => widgetRef.current?.getChemObj?.(),
      setChemObj: (obj: any) => {
        widgetRef.current?.setChemObj?.(obj);
        setHasChemObj(!!obj);
      },
      createEmptyMolecule: () => {
        if (!KekuleModule || !widgetRef.current) return;
        const emptyMol = new KekuleModule.Molecule();
        widgetRef.current.setChemObj(emptyMol);
        setHasChemObj(true);
      },
      exportToKekuleJson: () => {
        const obj = widgetRef.current?.getChemObj?.();
        return obj
          ? KekuleModule?.IO?.saveFormatData(obj, "Kekule-JSON")
          : null;
      },
      exportToSmiles: () => {
        const obj = widgetRef.current?.getChemObj?.();
        return obj
          ? KekuleModule?.IO?.saveFormatData(obj, "smi")
          : null;
      },
      importFromKekuleJson: (json: string) => {
        if (!KekuleModule || !widgetRef.current) return;
        const obj = KekuleModule.IO.loadFormatData(json, "Kekule-JSON");
        if (obj) {
          widgetRef.current.setChemObj(obj);
          setHasChemObj(true);
          onChange?.(obj);
        }
      },
      importFromSmiles: (smiles: string) => {
        if (!KekuleModule || !widgetRef.current) return;
        const obj = KekuleModule.IO.loadFormatData(smiles, "smi");
        if (obj) {
          widgetRef.current.setChemObj(obj);
          setHasChemObj(true);
          onChange?.(obj);
        }
      },
    }));

    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden border border-gray-200 rounded-lg ${className}`}
        style={{
          width: width || "100%",
          height: height || "100%",
        }}
      >
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-500">
            加载化学组件中...
          </div>
        )}

        {/* 空状态提示（可选） */}
      </div>
    );
  },
);

KekuleChemWidget.displayName = "KekuleChemWidget";

export default KekuleChemWidget;
