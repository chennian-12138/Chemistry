"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { ReactionNodeData } from "./types";

function ReactionNode({ data }: NodeProps<ReactionNodeData>) {
  return (
    <div
      className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 shadow-sm w-[150px]"
      title={data.templateSmarts}
    >
      <Handle type="target" position={Position.Left} className="!bg-amber-400" />
      <div className="text-[10px] font-medium text-amber-700 text-center truncate">
        {data.templateName}
      </div>
      <div className="text-[9px] text-amber-500 text-center">断键方法</div>
      <Handle type="source" position={Position.Right} className="!bg-amber-400" />
    </div>
  );
}

export default memo(ReactionNode);
