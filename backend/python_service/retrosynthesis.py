"""
逆合成分析核心逻辑。

模板来源：**数据库**中 status=APPROVED 的反应（reaction / reaction_pattern /
molecule_role 三张表），而非静态 CSV。这样既包含导入的 USPTO 模板，也包含站内
审核通过的用户反应，且新反应审核后可热刷（reload_templates）无需重启。

每条模板最终拼成逆合成方向的 Reaction SMARTS：`产物模式 >> 前驱体模式`。
对目标分子套用模板：把目标当作反应物喂给 RDKit 的 RunReactants，
LHS（产物模式）用于匹配目标，RHS（前驱体模式）生成上一步分子。
RunReactants 是 RDKit 原生能力，前端 WASM 不具备，故必须在此服务完成。
"""

import re
import threading

from rdkit import Chem
from rdkit.Chem import AllChem
from rdkit import RDLogger

from db import get_conn

# 关闭 RDKit 的告警噪声（模板套用会产生大量 sanitize 警告）
RDLogger.DisableLog("rdApp.*")

# molecule_role.role 取值
_ROLE_REACTANT = "反应物"
_ROLE_PRODUCT = "产物"
# 反应试剂（如 KMnO4）不作为逆合成拆出的前体，忽略

# 缓存已解析的模板；懒加载 + 双检锁，避免并发重复解析。
_templates = None  # list[dict]: {id, name, smarts, rxn, pattern}
_templates_lock = threading.Lock()


def _order_key(name: str) -> int:
    """molecule_role.name 形如 "反应物_2"，按尾部序号排序，保证多分子侧拼接顺序稳定。"""
    m = re.search(r"_(\d+)\s*$", name or "")
    return int(m.group(1)) if m else 0


def _build_retro_smarts(form, reactants, products):
    """把库里一条反应拼成逆合成方向的 Reaction SMARTS（产物模式 >> 前驱体模式）。

    - form=='template'：导入的 USPTO 逆合成模板，存储时 role=反应物 存的就是“匹配目标的
      产物侧”、role=产物 存的是“前驱体侧”，故 反应物 >> 产物 即为逆合成方向。
    - 其它（用户录入的正向反应）：role=反应物 是真实原料、role=产物 是真实产物；逆合成需
      反过来——用产物匹配目标、生成原料，故 产物 >> 反应物。
    """
    if form == "template":
        lhs, rhs = reactants, products
    else:
        lhs, rhs = products, reactants
    if not lhs or not rhs:
        return None
    return f'{".".join(lhs)}>>{".".join(rhs)}'


def _load_from_db():
    """从数据库读取 status=APPROVED 的反应并编译成逆合成模板列表。"""
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT r.id, r.name, r.form, mr.role, mr.name, mr.smarts
                    FROM reaction r
                    JOIN reaction_pattern rp ON rp."reactionId" = r.id
                    JOIN molecule_role mr ON mr."patternId" = rp.id
                    WHERE r.status = 'APPROVED'
                    """
                )
                rows = cur.fetchall()
    except Exception as e:
        print(f"[retro] 从数据库加载模板失败: {e}")
        return []

    # 按反应聚合各分子模式
    grouped = {}  # rid -> {name, form, reactants:[(idx,smarts)], products:[...]}
    for rid, rname, form, role, mname, smarts in rows:
        g = grouped.setdefault(
            rid, {"name": rname, "form": form, "reactants": [], "products": []}
        )
        s = (smarts or "").strip()
        if not s:
            continue
        if role == _ROLE_REACTANT:
            g["reactants"].append((_order_key(mname), s))
        elif role == _ROLE_PRODUCT:
            g["products"].append((_order_key(mname), s))

    loaded = []
    skipped = 0
    for rid, g in grouped.items():
        reactants = [s for _, s in sorted(g["reactants"])]
        products = [s for _, s in sorted(g["products"])]
        smarts = _build_retro_smarts(g["form"], reactants, products)
        if not smarts:
            skipped += 1
            continue
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
            {"id": rid, "name": g["name"], "smarts": smarts, "rxn": rxn, "pattern": pattern}
        )

    print(
        f"[retro] 已从数据库加载 {len(loaded)} 条模板"
        f"（跳过 {skipped} 条无效/缺侧），status=APPROVED"
    )
    return loaded


def _load_templates():
    global _templates
    if _templates is not None:
        return _templates
    with _templates_lock:
        if _templates is not None:
            return _templates
        _templates = _load_from_db()
        return _templates


def reload_templates() -> int:
    """清空缓存并重新从数据库加载（审核通过新反应后热刷用）。返回最新模板数。"""
    global _templates
    with _templates_lock:
        _templates = None
    return template_count()


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
