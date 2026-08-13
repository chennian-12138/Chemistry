"use client";

import { Fragment, useEffect, useState } from "react";
import { smilesToSvg } from "@/lib/rdkit-wasm";

/**
 * 聊天消息里的内联分子/反应渲染：SMILES（或 RDKit 反应 SMILES）→ RDKit WASM 结构图 SVG。
 *
 * - 单个化合物：渲染成内容自适应的居中卡片，结构图 + 下方 SMILES 标注。
 * - 反应（含 ">"，即 反应物.试剂>>产物）：拆分为反应物/产物，逐个渲染成小结构图，
 *   用 "+" 连接、中间加 "→" 箭头，排成一行反应式。
 *
 * 流式场景下 SMILES 围栏可能尚未闭合（字符串不完整），smilesToSvg 对非法输入
 * 返回空串，此时回退为纯文本/加载态；围栏闭合后自动切回结构图。
 * 单个分子用 debounce 合并连续 token 更新，避免逐字重复触发 WASM 渲染。
 */

/** 单个分子的 SVG（含加载/失败态），供单分子卡片与反应式复用 */
function MoleculeSvg({
  smiles,
  width,
  height,
}: {
  smiles: string;
  width: number;
  height: number;
}) {
  const [svg, setSvg] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const s = smiles.trim();
    if (!s) return;

    let alive = true;
    setSvg("");
    setFailed(false);

    const timer = setTimeout(() => {
      smilesToSvg(s, width, height).then((out) => {
        if (!alive) return;
        if (out) {
          setSvg(out);
        } else {
          setFailed(true);
        }
      });
    }, 120);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [smiles, width, height]);

  if (svg) {
    return (
      <div
        className="[&_svg]:max-w-full [&_svg]:h-auto"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  if (failed) {
    return (
      <code className="break-all font-mono text-xs text-muted-foreground">
        {smiles}
      </code>
    );
  }

  return (
    <span className="inline-block size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
  );
}

/** 解析 RDKit 反应 SMILES：反应物[.试剂]>>产物 */
function parseReaction(rxn: string): {
  reactants: string[];
  reagents: string[];
  products: string[];
} {
  const parts = rxn.split(">");
  const toList = (s: string) =>
    (s || "").split(".").map((x) => x.trim()).filter(Boolean);
  return {
    reactants: toList(parts[0] || ""),
    reagents: parts.length > 2 ? toList(parts[1] || "") : [],
    products: toList(parts[parts.length - 1] || ""),
  };
}

/** 一组分子（反应物或产物），用 "+" 连接 */
function MoleculeGroup({
  mols,
  width,
  height,
}: {
  mols: string[];
  width: number;
  height: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {mols.map((m, i) => (
        <Fragment key={`${m}-${i}`}>
          {i > 0 && (
            <span className="text-base font-medium text-muted-foreground">
              +
            </span>
          )}
          <MoleculeSvg smiles={m} width={width} height={height} />
        </Fragment>
      ))}
    </div>
  );
}

interface SmilesMoleculeProps {
  smiles: string;
}

export function SmilesMolecule({ smiles }: SmilesMoleculeProps) {
  const trimmed = smiles.trim();

  // 含 ">" 判定为反应 SMILES（单个分子 SMILES 不会出现 ">"）
  if (trimmed.includes(">")) {
    const { reactants, reagents, products } = parseReaction(trimmed);
    return (
      <div className="my-2 flex justify-center">
        <figure className="inline-flex flex-col items-center gap-2.5 rounded-lg border border-muted/60 bg-background/50 px-3 py-2">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <MoleculeGroup mols={reactants} width={130} height={110} />
            <span className="mx-1 text-xl leading-none text-muted-foreground">
              →
            </span>
            <MoleculeGroup mols={products} width={130} height={110} />
          </div>
          {reagents.length > 0 && (
            <div className="text-[11px] text-muted-foreground">
              试剂：{reagents.join(" · ")}
            </div>
          )}
          <figcaption className="max-w-full break-all font-mono text-[11px] text-muted-foreground">
            {trimmed}
          </figcaption>
        </figure>
      </div>
    );
  }

  return (
    <div className="my-2 flex justify-center">
      <figure className="inline-flex flex-col items-center gap-2.5 rounded-lg border border-muted/60 bg-background/50 px-3 py-2">
        <MoleculeSvg smiles={trimmed} width={200} height={150} />
        <figcaption className="max-w-full break-all font-mono text-[11px] text-muted-foreground">
          {trimmed}
        </figcaption>
      </figure>
    </div>
  );
}

export default SmilesMolecule;
