"use client";

import { useEffect, useState } from "react";
import { smilesToSvg } from "@/lib/rdkit-wasm";

interface Props {
  smiles: string;
  width?: number;
  height?: number;
  className?: string;
}

/** 由 SMILES 客户端渲染分子结构 SVG（RDKit WASM），复用于浏览/详情。 */
export default function MolImg({ smiles, width = 180, height = 130, className }: Props) {
  const [svg, setSvg] = useState("");

  useEffect(() => {
    let alive = true;
    smilesToSvg(smiles, width, height).then((s) => {
      if (alive) setSvg(s);
    });
    return () => {
      alive = false;
    };
  }, [smiles, width, height]);

  if (!svg) {
    return (
      <div
        style={{ width, height }}
        className="flex items-center justify-center text-xs text-gray-400"
      >
        …
      </div>
    );
  }

  return (
    <div
      className={`[&_svg]:max-w-full [&_svg]:max-h-full ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
