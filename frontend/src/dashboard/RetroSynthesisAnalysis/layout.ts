// 用 dagre 对逆合成图做分层布局（左→右）。
import dagre from "dagre";
import type { Node, Edge } from "reactflow";

const SIZE: Record<string, { width: number; height: number }> = {
  molecule: { width: 240, height: 200 },
  reaction: { width: 150, height: 56 },
};

export function layoutGraph(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 32, ranksep: 90, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of nodes) {
    const s = SIZE[n.type ?? "molecule"] ?? SIZE.molecule;
    g.setNode(n.id, { width: s.width, height: s.height });
  }
  for (const e of edges) {
    g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  return nodes.map((n) => {
    const s = SIZE[n.type ?? "molecule"] ?? SIZE.molecule;
    const p = g.node(n.id);
    return {
      ...n,
      // dagre 给的是中心点，React Flow 用左上角
      position: { x: p.x - s.width / 2, y: p.y - s.height / 2 },
    };
  });
}
