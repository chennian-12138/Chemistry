"use client";

import { memo, useEffect, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import MolImg from "./MolImg";
import { layoutGraph } from "./layout";

export interface RouteStepView {
  id: string;
  productSmiles: string;
  precursors: string[];
  templateName: string | null;
  templateSmarts: string | null;
  upvotes: number;
  downvotes: number;
  myVote: number;
}

interface MolData {
  smiles: string;
  isTarget: boolean;
  isStartingMaterial: boolean;
}

interface RxnData {
  stepId: string;
  templateName: string | null;
  templateSmarts: string | null;
  upvotes: number;
  downvotes: number;
  myVote: number;
  onVote: (stepId: string, target: 1 | -1) => void;
}

// ---- 只读分子节点 ----
const MolNode = memo(({ data }: NodeProps<MolData>) => (
  <div
    className={`rounded-xl border bg-white shadow-sm w-[200px] overflow-hidden ${
      data.isTarget ? "border-indigo-500 ring-2 ring-indigo-200" : "border-gray-200"
    }`}
  >
    <Handle type="target" position={Position.Left} className="!bg-gray-400" />
    {(data.isTarget || data.isStartingMaterial) && (
      <div
        className={`px-2 py-0.5 text-[10px] font-medium border-b ${
          data.isTarget
            ? "text-indigo-600 bg-indigo-50 border-indigo-100"
            : "text-emerald-600 bg-emerald-50 border-emerald-100"
        }`}
      >
        {data.isTarget ? "最终产物" : "起始原料"}
      </div>
    )}
    <div className="h-[120px] flex items-center justify-center p-1">
      <MolImg smiles={data.smiles} width={190} height={115} />
    </div>
    <Handle type="source" position={Position.Right} className="!bg-gray-400" />
  </div>
));
MolNode.displayName = "MolNode";

// ---- 反应节点（含单步打分）----
const RxnNode = memo(({ data }: NodeProps<RxnData>) => (
  <div
    className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 shadow-sm w-[150px]"
    title={data.templateSmarts ?? ""}
  >
    <Handle type="target" position={Position.Left} className="!bg-amber-400" />
    <div className="text-[10px] font-medium text-amber-700 text-center truncate mb-1">
      {data.templateName || "未知方法"}
    </div>
    <div className="flex items-center justify-center gap-1">
      <button
        className={`nodrag px-1.5 py-0.5 rounded text-[11px] border ${
          data.myVote === 1
            ? "bg-emerald-500 text-white border-emerald-500"
            : "text-emerald-600 border-emerald-200 hover:bg-emerald-100"
        }`}
        onClick={() => data.onVote(data.stepId, 1)}
      >
        👍 {data.upvotes}
      </button>
      <button
        className={`nodrag px-1.5 py-0.5 rounded text-[11px] border ${
          data.myVote === -1
            ? "bg-rose-500 text-white border-rose-500"
            : "text-rose-500 border-rose-200 hover:bg-rose-100"
        }`}
        onClick={() => data.onVote(data.stepId, -1)}
      >
        👎 {data.downvotes}
      </button>
    </div>
    <Handle type="source" position={Position.Right} className="!bg-amber-400" />
  </div>
));
RxnNode.displayName = "RxnNode";

const nodeTypes = { mol: MolNode, rxn: RxnNode };

interface Props {
  steps: RouteStepView[];
  targetSmiles: string;
  onVote: (stepId: string, target: 1 | -1) => void;
}

/**
 * 把一条已保存路线渲染成一整张反应路线图：
 * 正向（起始原料 → 最终产物）分层排布，分子按 SMILES 去重相连，
 * 每个反应节点带单步 👍/👎 打分。
 */
export default function RouteGraph({ steps, targetSmiles, onVote }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const graph = useMemo(() => {
    const productSet = new Set(steps.map((s) => s.productSmiles));
    const precursorSet = new Set(steps.flatMap((s) => s.precursors));
    const molSmiles = new Set<string>([...productSet, ...precursorSet]);

    const rawNodes: Node[] = [];
    const rawEdges: Edge[] = [];

    for (const smi of molSmiles) {
      const data: MolData = {
        smiles: smi,
        isTarget: smi === targetSmiles,
        // 起始原料：作为前驱体出现、但从不是任何一步的产物（即叶子）
        isStartingMaterial: precursorSet.has(smi) && !productSet.has(smi),
      };
      rawNodes.push({
        id: `m:${smi}`,
        type: "mol",
        position: { x: 0, y: 0 },
        data,
      });
    }

    for (const s of steps) {
      const rxnId = `r:${s.id}`;
      const data: RxnData = {
        stepId: s.id,
        templateName: s.templateName,
        templateSmarts: s.templateSmarts,
        upvotes: s.upvotes,
        downvotes: s.downvotes,
        myVote: s.myVote,
        onVote,
      };
      rawNodes.push({ id: rxnId, type: "rxn", position: { x: 0, y: 0 }, data });
      // 正向：前驱体 → 反应 → 产物
      for (const p of s.precursors) {
        rawEdges.push({ id: `e:${p}->${rxnId}`, source: `m:${p}`, target: rxnId });
      }
      rawEdges.push({
        id: `e:${rxnId}->${s.productSmiles}`,
        source: rxnId,
        target: `m:${s.productSmiles}`,
        animated: true,
      });
    }

    return { nodes: layoutGraph(rawNodes, rawEdges), edges: rawEdges };
  }, [steps, targetSmiles, onVote]);

  useEffect(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [graph, setNodes, setEdges]);

  return (
    <div className="w-full h-[520px] rounded-xl border bg-white">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
