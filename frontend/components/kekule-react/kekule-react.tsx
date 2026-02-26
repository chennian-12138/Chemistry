/* eslint-disable @typescript-eslint/no-explicit-any */
// components/kekule/KekuleChemWidget.tsx
"use client";

import { el } from "date-fns/locale";
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
  className?: string;
  predefinedSetting?: string;
  enableToolbar?: boolean;
  allowEmpty?: boolean;
  syncExternalChemObj?: boolean;
  // 是否同步外部传入的 chemObj
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
  exportToMolBlock: () => string | null;
  highlightAtoms: (atomIndices: number[]) => void;
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
      allowEmpty = true,
      syncExternalChemObj = false,
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetRef = useRef<any>(null);
    const [isReady, setIsReady] = useState(false);
    const [KekuleModule, setKekuleModule] = useState<any>(null);
    const [hasChemObj, setHasChemObj] = useState(false);

    const isInitializedRef = useRef(false);
    const pendingChemObjRef = useRef<any>(null);

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
                .setEnableDirectInteraction(true)
                .setPredefinedSetting(predefinedSetting)
                .setRestrainEditorWithCurrObj(false);

              widget.on("load", (e: any) => {
                if (e.target === widget) {
                  const newObj = widget.getChemObj();
                  setHasChemObj(!!newObj);
                  onChange?.(newObj);
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

              widget.on("userModificationDone", () => {
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

          if (initialChemObj && !isInitializedRef.current) {
            widget.setChemObj(initialChemObj);
            setHasChemObj(true);
            isInitializedRef.current = true;
          } else if (
            !allowEmpty &&
            type !== "periodicTable" &&
            !isInitializedRef.current
          ) {
            const emptyMol = new KekuleModule.Molecule();
            widget.setChemObj(emptyMol);
            setHasChemObj(true);
            isInitializedRef.current = true;
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
    }, [type, predefinedSetting, allowEmpty]);

    useEffect(() => {
      if (!syncExternalChemObj || !widgetRef.current || !isReady) return;

      if (initialChemObj && pendingChemObjRef.current !== initialChemObj) {
        widgetRef.current.setChemObj(initialChemObj);
        setHasChemObj(true);
        pendingChemObjRef.current = initialChemObj;
      }
    }, [initialChemObj, isReady, syncExternalChemObj]);

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
        return obj ? KekuleModule?.IO?.saveFormatData(obj, "smi") : null;
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
      exportToMolBlock: () => {
        const obj = widgetRef.current?.getChemObj?.();
        return obj
          ? (KekuleModule?.IO?.saveFormatData(obj, "mol") ?? null)
          : null;
      },
      highlightAtoms: (atomIndices: number[]) => {
        const obj = widgetRef.current?.getChemObj?.();

        if (!obj || !atomIndices?.length) return;

        try {
          let mol: any = null;

          if (typeof obj.filterChildren === "function") {
            // 直接获取第一个元素
            const children = obj.filterChildren(() => true);
            console.log("filterChildren 结果:", children);

            if (Array.isArray(children) && children[0]) {
              // 检查第一个元素是否有 getNodes 方法
              if (typeof children[0].getNodes === "function") {
                mol = children[0];
              }
            }
          } else if (typeof obj.getNodes === "function") {
            mol = obj;
          }

          console.log("找到的 mol:", mol);
          console.log("mol 是否有 getNodes:", mol ? typeof mol.getNodes : "no");

          if (!mol) {
            console.warn("未找到分子对象");
            return;
          }

          // 获取匹配的原子
          const matchedAtoms = atomIndices
            .map((index) => mol.getNodeAt(index))
            .filter(Boolean);

          console.log("matchedAtoms 数量:", matchedAtoms.length);

          if (!matchedAtoms.length) return;

          // 获取匹配的化学键
          const matchedBonds: any[] = [];
          for (const atom of matchedAtoms) {
            const bonds = atom.getLinkedConnectors();
            for (const bond of bonds) {
              if (matchedBonds.includes(bond)) continue;
              const connectedNodes = bond.getConnectedChemNodes();
              const allConnected = connectedNodes.every((node) =>
                matchedAtoms.includes(node),
              );
              if (allConnected) matchedBonds.push(bond);
            }
          }

          const matchedObjs = [...matchedAtoms, ...matchedBonds];

          // 设置颜色
          const childObjs = [
            ...(mol.getNodes?.() || []),
            ...(mol.getConnectors?.() || []),
          ];
          console.log("childObjs 数量:", childObjs.length);

          for (const childObj of childObjs) {
            if (matchedObjs.includes(childObj)) {
              childObj.setRenderOption("color", "#ff0000");
            } else {
              childObj.setRenderOption("color", "#000000");
            }
          }
        } catch (error) {
          console.error("高亮失败:", error);
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
