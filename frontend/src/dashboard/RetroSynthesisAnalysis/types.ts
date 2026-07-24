// 逆合成探索图的共享类型。

export interface MoleculeNodeData {
  smiles: string;
  /** RDKit 渲染的分子结构 SVG（客户端生成） */
  svg: string;
  depth: number;
  isTarget: boolean;
  expanded: boolean;
  loading: boolean;
  /** 展开后没有任何模板命中（可视作“足够简单/无已知拆法”） */
  noPrecursors: boolean;
  onExpand: (nodeId: string) => void;
}

export interface ReactionNodeData {
  templateId: string;
  templateName: string;
  templateSmarts: string;
}

// 领域模型（与 React Flow 节点解耦，便于序列化保存）

export interface MoleculeEntry {
  id: string;
  smiles: string;
  svg: string;
  depth: number;
  isTarget: boolean;
  expanded: boolean;
  loading: boolean;
  noPrecursors: boolean;
  /** 产出该分子的反应节点 id；目标分子为 null */
  parentReactionId: string | null;
}

export interface ReactionEntry {
  id: string;
  productMolId: string;
  templateId: string;
  templateName: string;
  templateSmarts: string;
  precursorMolIds: string[];
}
