"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@/components/ui/button";
import { smilesToSvg, molBlockToSmiles } from "@/lib/rdkit-wasm";
import {
  retroExpand,
  saveRetroRoute,
  listRetroRoutes,
  type SaveRouteStep,
  type RetroPrecursorSet,
} from "@/lib/api";
import MoleculeNode from "./MoleculeNode";
import ReactionNode from "./ReactionNode";
import MolImg from "./MolImg";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { layoutGraph } from "./layout";
import type {
  MoleculeEntry,
  ReactionEntry,
  MoleculeNodeData,
  ReactionNodeData,
} from "./types";
import Link from "next/link";

// Kekule 依赖 window/document，禁用 SSR
const Composer = dynamic(() => import("@/components/kekule-react/composer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-muted/20 animate-pulse rounded-md border text-muted-foreground">
      加载分子编辑器…
    </div>
  ),
});

// nodeTypes 必须稳定，定义在组件外
const nodeTypes = { molecule: MoleculeNode, reaction: ReactionNode };

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${counter++}`;
const fmtDate = (iso: string) => (iso ? iso.slice(0, 10) : "");

export default function RetroSynthesisAnalysis() {
  const { requireAuth, loginPrompt } = useRequireAuth();
  const [phase, setPhase] = useState<"input" | "graph">("input");
  const [molBlock, setMolBlock] = useState("");
  const [starting, setStarting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // 输入页下方展示：近一周社区路线，按分降序
  const [recentRoutes, setRecentRoutes] = useState<any[]>([]);
  useEffect(() => {
    if (phase !== "input") return;
    listRetroRoutes({ withinDays: 7, sort: "top", pageSize: 12 })
      .then((res) => setRecentRoutes(res.items ?? []))
      .catch(() => {});
  }, [phase]);

  const [molecules, setMolecules] = useState<Record<string, MoleculeEntry>>({});
  const [reactions, setReactions] = useState<Record<string, ReactionEntry>>({});

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);

  const [saveOpen, setSaveOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // 候选断键方案（展开后待用户选择的多条互斥路线）
  const [chooser, setChooser] = useState<{
    molId: string;
    smiles: string;
    sets: RetroPrecursorSet[];
  } | null>(null);

  // ---------- 展开某个分子：只取候选，交给用户选择，先不提交 ----------
  const handleExpand = useCallback(async (molId: string) => {
    let smiles = "";
    setMolecules((prev) => {
      const m = prev[molId];
      if (!m || m.expanded || m.loading) return prev;
      smiles = m.smiles;
      return { ...prev, [molId]: { ...m, loading: true } };
    });
    if (!smiles) return;

    try {
      const res = await retroExpand(smiles, 12);
      if (!res.success) throw new Error(res.error || "展开失败");

      if (res.precursorSets.length === 0) {
        // 没有可用拆法 —— 视为足够简单的原料
        setMolecules((prev) => ({
          ...prev,
          [molId]: { ...prev[molId], loading: false, noPrecursors: true },
        }));
        return;
      }

      // 打开候选选择器；分子保持 loading 直到用户选择或取消，避免重复点击
      setChooser({ molId, smiles, sets: res.precursorSets });
    } catch (e: any) {
      setStatus(`展开失败：${e.message}`);
      setMolecules((prev) => ({
        ...prev,
        [molId]: { ...prev[molId], loading: false },
      }));
    }
  }, []);

  // ---------- 用户选定一条方案：仅提交该方案到路线 ----------
  const chooseSet = async (setIndex: number) => {
    if (!chooser) return;
    const { molId, sets } = chooser;
    const set = sets[setIndex];
    const parentDepth = molecules[molId]?.depth ?? 0;

    const rxnId = nextId("rxn");
    const precursorMolIds: string[] = [];
    const newMols: Record<string, MoleculeEntry> = {};

    for (const pSmiles of set.precursors) {
      const mId = nextId("mol");
      const svg = await smilesToSvg(pSmiles);
      newMols[mId] = {
        id: mId,
        smiles: pSmiles,
        svg,
        depth: parentDepth + 1,
        isTarget: false,
        expanded: false,
        loading: false,
        noPrecursors: false,
        parentReactionId: rxnId,
      };
      precursorMolIds.push(mId);
    }

    setMolecules((prev) => ({
      ...prev,
      ...newMols,
      [molId]: {
        ...prev[molId],
        loading: false,
        expanded: true,
        noPrecursors: false,
      },
    }));
    setReactions((prev) => ({
      ...prev,
      [rxnId]: {
        id: rxnId,
        productMolId: molId,
        templateId: set.templateId,
        templateName: set.templateName,
        templateSmarts: set.templateSmarts,
        precursorMolIds,
      },
    }));
    setChooser(null);
  };

  const cancelChooser = () => {
    if (!chooser) return;
    const molId = chooser.molId;
    setMolecules((prev) => ({
      ...prev,
      [molId]: { ...prev[molId], loading: false },
    }));
    setChooser(null);
  };

  // ---------- 开始分析：从画板 MolBlock 得到目标分子 ----------
  const handleStart = async () => {
    if (!molBlock) return;
    setStarting(true);
    setStatus(null);
    try {
      const smiles = await molBlockToSmiles(molBlock);
      if (!smiles) {
        setStatus("无法解析所绘分子，请检查结构");
        return;
      }
      const svg = await smilesToSvg(smiles);
      const id = nextId("mol");
      setMolecules({
        [id]: {
          id,
          smiles,
          svg,
          depth: 0,
          isTarget: true,
          expanded: false,
          loading: false,
          noPrecursors: false,
          parentReactionId: null,
        },
      });
      setReactions({});
      setPhase("graph");
    } catch (e: any) {
      setStatus(`初始化失败：${e.message}`);
    } finally {
      setStarting(false);
    }
  };

  const resetAll = () => {
    setMolecules({});
    setReactions({});
    setPhase("input");
    setStatus(null);
  };

  // ---------- 领域模型 -> React Flow 图 + 布局 ----------
  useEffect(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    for (const m of Object.values(molecules)) {
      const data: MoleculeNodeData = {
        smiles: m.smiles,
        svg: m.svg,
        depth: m.depth,
        isTarget: m.isTarget,
        expanded: m.expanded,
        loading: m.loading,
        noPrecursors: m.noPrecursors,
        onExpand: handleExpand,
      };
      nodes.push({
        id: m.id,
        type: "molecule",
        position: { x: 0, y: 0 },
        data,
      });
    }

    for (const r of Object.values(reactions)) {
      const data: ReactionNodeData = {
        templateId: r.templateId,
        templateName: r.templateName,
        templateSmarts: r.templateSmarts,
      };
      nodes.push({
        id: r.id,
        type: "reaction",
        position: { x: 0, y: 0 },
        data,
      });
      edges.push({
        id: `e-${r.productMolId}-${r.id}`,
        source: r.productMolId,
        target: r.id,
        animated: true,
      });
      for (const pid of r.precursorMolIds) {
        edges.push({ id: `e-${r.id}-${pid}`, source: r.id, target: pid });
      }
    }

    setRfNodes(layoutGraph(nodes, edges));
    setRfEdges(edges);
  }, [molecules, reactions, handleExpand, setRfNodes, setRfEdges]);

  const reactionCount = Object.keys(reactions).length;

  // ---------- 序列化保存 ----------
  const serializeSteps = (): SaveRouteStep[] => {
    const list = Object.values(reactions);
    const idToIndex = new Map(list.map((r, i) => [r.id, i]));
    // 每个前驱体分子由某个反应产出：molId -> 产出它的反应 id
    const producedBy = new Map<string, string>();
    for (const r of list) {
      for (const pid of r.precursorMolIds) producedBy.set(pid, r.id);
    }
    return list.map((r) => {
      const product = molecules[r.productMolId];
      const parentRxn = producedBy.get(r.productMolId) ?? null;
      return {
        productSmiles: product.smiles,
        precursors: r.precursorMolIds.map((id) => molecules[id].smiles),
        templateId: r.templateId,
        templateName: r.templateName,
        templateSmarts: r.templateSmarts,
        depth: product.depth,
        parentIndex: parentRxn != null ? idToIndex.get(parentRxn)! : null,
      };
    });
  };

  const handleSave = async () => {
    if (!requireAuth()) return;
    setSaving(true);
    setStatus(null);
    try {
      const target = Object.values(molecules).find((m) => m.isTarget);
      if (!target) return;
      const res = await saveRetroRoute({
        targetSmiles: target.smiles,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        isPublic: true,
        steps: serializeSteps(),
      });
      if (res.success) {
        setSaveOpen(false);
        setTitle("");
        setDescription("");
        setStatus("路线已保存并发布 ✓");
      } else {
        setStatus(res.error || "保存失败（是否已登录？）");
      }
    } catch (e: any) {
      setStatus(`保存失败：${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ---------- 渲染 ----------
  if (phase === "input") {
    return (
      <div className="w-full flex flex-col gap-6 py-6 px-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">逆合成分析</h1>
          <p className="text-muted-foreground text-sm">
            绘制目标分子，逐步逆推可行的合成路线。
          </p>
        </div>
        <div className="h-[460px] w-full max-w-4xl mx-auto bg-white rounded-lg border overflow-hidden">
          <Composer
            className="w-full h-full"
            exportFormat="molblock"
            onChange={(val) => setMolBlock(val)}
          />
        </div>
        {status && <p className="text-sm text-red-500 text-center">{status}</p>}
        <div className="flex justify-center gap-3">
          <Button
            size="lg"
            onClick={handleStart}
            disabled={!molBlock || starting}
            className="px-8"
          >
            {starting ? "分析中…" : "开始分析"}
          </Button>
          <Link href="/dashboard/retrosynthesisanalysis/routes">
            <Button size="lg" variant="outline">
              浏览社区路线
            </Button>
          </Link>
        </div>

        {/* 近一周社区路线（按分降序） */}
        {recentRoutes.length > 0 && (
          <div className="pt-4 mt-2 border-t">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">本周热门路线</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {recentRoutes.map((r) => (
                <Link
                  key={r.id}
                  href={`/dashboard/retrosynthesisanalysis/routes/${r.id}`}
                  className="block rounded-lg border bg-white hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div className="h-[240px] flex items-center justify-center bg-white border-b p-1">
                    <MolImg smiles={r.targetSmiles} width={240} height={150} />
                  </div>
                  <div className="p-2 space-y-1">
                    <h3 className="text-xs font-medium truncate">
                      {r.title || "未命名路线"}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-gray-500">
                      <span className="text-emerald-600">👍 {r.upvotes}</span>
                      <span>💬 {r.commentCount}</span>
                      <span className="ml-auto">{fmtDate(r.createdAt)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-120px)] flex flex-col">
      {loginPrompt}
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-white">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetAll}>
            重新绘制
          </Button>
          <span className="text-sm text-muted-foreground">
            已展开 {reactionCount} 步
          </span>
        </div>
        <div className="flex items-center gap-2">
          {status && <span className="text-sm text-emerald-600">{status}</span>}
          <a href="/dashboard/retrosynthesisanalysis/routes">
            <Button variant="ghost" size="sm">
              社区路线
            </Button>
          </a>
          <Button
            size="sm"
            onClick={() => setSaveOpen(true)}
            disabled={reactionCount === 0}
          >
            保存路线
          </Button>
        </div>
      </div>

      {/* 图 */}
      <div className="flex-1">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>

      {/* 候选断键方案选择器 */}
      {chooser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">选择一条断键方案</h2>
                <p className="text-xs text-muted-foreground">
                  共 {chooser.sets.length}{" "}
                  种可行拆法，选一条并入你的路线，之后可继续往前推。
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={cancelChooser}>
                取消
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chooser.sets.map((set, i) => (
                <div
                  key={i}
                  className="rounded-lg border hover:border-indigo-400 hover:shadow-sm transition-all p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      方案 {i + 1} · {set.templateName}
                    </span>
                    <div className="flex items-center gap-2">
                      {set.reactionId && (
                        <a
                          href={`/dashboard/reactdic/${set.reactionId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          查看反应介绍 ↗
                        </a>
                      )}
                      <Button size="sm" onClick={() => chooseSet(i)}>
                        选择这条
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {set.precursors.map((p, j) => (
                      <div
                        key={j}
                        className="flex flex-col items-center border rounded-md bg-gray-50 p-1"
                      >
                        <MolImg smiles={p} width={140} height={100} />
                        <span
                          className="text-[9px] text-gray-400 font-mono truncate max-w-[140px]"
                          title={p}
                        >
                          {p}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 保存对话框 */}
      {saveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-[440px] p-5 space-y-4">
            <h2 className="text-lg font-semibold">保存并发布路线</h2>
            <p className="text-xs text-muted-foreground">
              保存后其他用户可参考、评论，并对每一步断键打分。
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">标题（可选）</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：布洛芬的一条逆合成路线"
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">说明（可选）</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="这条路线的思路、关键断键……"
                className="w-full border rounded-md px-3 py-2 text-sm resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setSaveOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "保存中…" : "发布"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
