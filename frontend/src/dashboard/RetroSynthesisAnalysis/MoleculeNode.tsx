"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { MoleculeNodeData } from "./types";

function MoleculeNode({ id, data }: NodeProps<MoleculeNodeData>) {
  const canExpand = !data.expanded && !data.loading && !data.noPrecursors;

  return (
    <div
      className={`rounded-xl border bg-white shadow-sm w-[240px] overflow-hidden ${
        data.isTarget ? "border-indigo-500 ring-2 ring-indigo-200" : "border-gray-200"
      }`}
    >
      {!data.isTarget && (
        <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      )}

      {data.isTarget && (
        <div className="px-2 py-1 text-[11px] font-medium text-indigo-600 bg-indigo-50 border-b border-indigo-100">
          目标分子
        </div>
      )}

      {/* 分子结构图 */}
      <div className="h-[150px] flex items-center justify-center bg-white p-1">
        {data.svg ? (
          <div
            className="w-full h-full flex items-center justify-center [&_svg]:max-w-full [&_svg]:max-h-full"
            dangerouslySetInnerHTML={{ __html: data.svg }}
          />
        ) : (
          <span className="text-xs text-gray-400">渲染中…</span>
        )}
      </div>

      {/* SMILES + 操作 */}
      <div className="border-t border-gray-100 px-2 py-1.5 space-y-1.5">
        <div
          className="text-[10px] text-gray-500 font-mono truncate"
          title={data.smiles}
        >
          {data.smiles}
        </div>

        {canExpand && (
          <button
            onClick={() => data.onExpand(id)}
            className="w-full text-xs py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            展开前驱体
          </button>
        )}
        {data.loading && (
          <div className="w-full text-xs py-1 text-center text-gray-500">
            分析中…
          </div>
        )}
        {data.noPrecursors && (
          <div className="w-full text-[11px] py-1 text-center text-emerald-600">
            无更多拆法（可视为原料）
          </div>
        )}
        {data.expanded && !data.noPrecursors && (
          <div className="w-full text-[11px] py-1 text-center text-gray-400">
            已展开
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-gray-400" />
    </div>
  );
}

export default memo(MoleculeNode);
