"""
逆合成分析核心逻辑。

模板来源：USPTO 逆合成模板 CSV，每行 `template_name,smarts`，
其中 smarts 形如 `产物模式 >> 前驱体模式`（逆合成方向）。

对目标分子套用模板：把目标当作反应物喂给 RDKit 的 RunReactants，
LHS（产物模式）用于匹配目标，RHS（前驱体模式）生成上一步分子。
RunReactants 是 RDKit 原生能力，前端 WASM 不具备，故必须在此服务完成。
"""

import os
import threading

from rdkit import Chem
from rdkit.Chem import AllChem
from rdkit import RDLogger

# 关闭 RDKit 的告警噪声（模板套用会产生大量 sanitize 警告）
RDLogger.DisableLog("rdApp.*")

# 模板 CSV 路径：默认指向仓库根的 templates_demo.csv，可用 RETRO_TEMPLATES_CSV 覆盖。
# 从 backend/python_service 出发，仓库根在上两级。
_DEFAULT_CSV = os.path.join(
    os.path.dirname(__file__), "..", "..", "templates", "templates_demo.csv"
)
TEMPLATES_CSV = os.environ.get("RETRO_TEMPLATES_CSV", _DEFAULT_CSV)

# 缓存已解析的模板；懒加载 + 双检锁，避免并发重复解析。
_templates = None  # list[dict]: {name, smarts, rxn, pattern}
_templates_lock = threading.Lock()


def _parse_template_line(line: str):
    """解析一行 `template_name,smarts`。

    SMARTS 内部可能含逗号（如 [C,N]），因此仅按第一个逗号切分。
    """
    line = line.strip()
    if not line or "," not in line:
        return None
    name, smarts = line.split(",", 1)
    name, smarts = name.strip(), smarts.strip()
    if not name or ">>" not in smarts:
        return None
    return name, smarts


def _load_templates():
    global _templates
    if _templates is not None:
        return _templates
    with _templates_lock:
        if _templates is not None:
            return _templates

        path = os.path.abspath(TEMPLATES_CSV)
        loaded = []
        if not os.path.exists(path):
            print(f"[retro] 模板文件不存在: {path}")
            _templates = []
            return _templates

        with open(path, encoding="utf-8") as f:
            lines = f.read().splitlines()

        skipped = 0
        for line in lines[1:]:  # 跳过表头
            parsed = _parse_template_line(line)
            if parsed is None:
                continue
            name, smarts = parsed
            try:
                rxn = AllChem.ReactionFromSmarts(smarts)
                if rxn is None:
                    skipped += 1
                    continue
                rxn.Initialize()
                # 逆合成模板加载为 ChemicalReaction 后，LHS(产物) 成为“反应物模板”，
                # 即用于匹配目标分子的模式。
                pattern = (
                    rxn.GetReactantTemplate(0)
                    if rxn.GetNumReactantTemplates() > 0
                    else None
                )
            except Exception:
                skipped += 1
                continue
            loaded.append(
                {"name": name, "smarts": smarts, "rxn": rxn, "pattern": pattern}
            )

        _templates = loaded
        print(f"[retro] 已加载 {len(loaded)} 条模板（跳过 {skipped} 条无效），来源: {path}")
        return _templates


def template_count() -> int:
    return len(_load_templates())


def canonical_smiles(smiles: str):
    """返回 canonical SMILES，非法输入返回 None。"""
    mol = Chem.MolFromSmiles(smiles)
    return Chem.MolToSmiles(mol) if mol is not None else None


def expand_one(smiles: str, max_results: int = 25) -> dict:
    """对单个分子做一步逆合成展开。

    返回 { target, precursorSets: [{templateId, templateName, templateSmarts, precursors[]}], count }。
    每个 precursorSet 代表一种“断键方法”及其给出的上一步分子。
    """
    target = Chem.MolFromSmiles(smiles)
    if target is None:
        return {"error": "无效的 SMILES", "target": smiles, "precursorSets": [], "count": 0}

    target_canon = Chem.MolToSmiles(target)
    templates = _load_templates()

    results = []
    seen = set()  # 去重键: (templateName, frozenset(precursors))

    for t in templates:
        pattern = t["pattern"]
        # 子结构预筛：产物模式匹配不上就跳过，避免无谓的 RunReactants。
        if pattern is not None:
            try:
                if not target.HasSubstructMatch(pattern):
                    continue
            except Exception:
                continue

        try:
            outcomes = t["rxn"].RunReactants((target,))
        except Exception:
            continue

        for outcome in outcomes:
            precursors = []
            ok = True
            for pmol in outcome:
                try:
                    Chem.SanitizeMol(pmol)
                    smi = Chem.MolToSmiles(pmol)
                except Exception:
                    ok = False
                    break
                if not smi:
                    ok = False
                    break
                precursors.append(smi)

            if not ok or not precursors:
                continue
            # 排除自反应（前驱体与目标完全相同）
            if len(precursors) == 1 and precursors[0] == target_canon:
                continue

            key = (t["name"], frozenset(precursors))
            if key in seen:
                continue
            seen.add(key)

            results.append(
                {
                    "templateId": t["name"],
                    "templateName": t["name"],
                    "templateSmarts": t["smarts"],
                    "precursors": precursors,
                }
            )
            if len(results) >= max_results:
                break
        if len(results) >= max_results:
            break

    return {"target": target_canon, "precursorSets": results, "count": len(results)}


def match_molecules(query: str, mode: str, candidates: list) -> list:
    """在候选分子中找出与 query 匹配的 id。

    candidates: [{"id": str, "smiles": str}, ...]
    mode: "exact"(canonical SMILES 相等) | "substructure"(子结构包含)
    query: SMILES 或 SMARTS。
    """
    # 子结构模式优先按 SMARTS 解析，退回 SMILES；精确模式用 canonical SMILES 比较
    qmol = Chem.MolFromSmarts(query) or Chem.MolFromSmiles(query)
    if qmol is None:
        return []

    q_canon = None
    if mode == "exact":
        qm = Chem.MolFromSmiles(query)
        q_canon = Chem.MolToSmiles(qm) if qm is not None else None
        if q_canon is None:
            return []

    matched = []
    for c in candidates:
        smi = c.get("smiles")
        cid = c.get("id")
        if not smi or not cid:
            continue
        m = Chem.MolFromSmiles(smi)
        if m is None:
            continue
        try:
            if mode == "exact":
                if Chem.MolToSmiles(m) == q_canon:
                    matched.append(cid)
            else:
                if m.HasSubstructMatch(qmol):
                    matched.append(cid)
        except Exception:
            continue
    return matched
