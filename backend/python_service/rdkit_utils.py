from rdkit import Chem
from rdkit.Chem import Draw, AllChem
from rdkit.Chem.Draw import rdMolDraw2D
from itertools import permutations
import json
import re

def smiles_to_kekule_json(smiles: str) -> str:
    """将SMILES转换为Kekule JSON格式"""
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return json.dumps({"error": "Invalid SMILES"})
    
    # 转换为Kekule JSON
    mol.SetProp("_Name", "Molecule")
    json_str = Chem.MolToJSON(mol)
    return json_str

def detect_functional_group(smiles: str, smarts: str) -> dict:
    """检测分子中的官能团，返回匹配的原子索引"""
    mol = Chem.MolFromSmiles(smiles)
    pattern = Chem.MolFromSmarts(smarts)
    
    if mol is None or pattern is None:
        return {"error": "Invalid SMILES or SMARTS", "matches": []}
    
    matches = mol.GetSubstructMatches(pattern)
    # 将tuple转换为list
    matches = [list(match) for match in matches]
    
    # 获取所有匹配的原子索引
    all_atom_indices = set()
    for match in matches:
        all_atom_indices.update(match)
    
    return {
        "smiles": smiles,
        "smarts": smarts,
        "match_count": len(matches),
        "matches": matches,
        "atom_indices": list(all_atom_indices)
    }

def highlight_atoms_in_mol(smiles: str, atom_indices: list) -> str:
    """高亮显示指定原子，返回带有高亮的分子渲染（返回SVG或原子列表供前端处理）"""
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return json.dumps({"error": "Invalid SMILES"})
    
    # 返回原子索引，让前端在Kekule中处理高亮
    return json.dumps({
        "smiles": smiles,
        "highlighted_atoms": atom_indices,
        "atom_count": mol.GetNumAtoms()
    })

def find_smart_pattern_in_kekule_json(smarts:str, kekule_json:str) -> dict:
    # 本段代码用于从前端返回的kekule json中查找smarts模式
    try:
        mol = Chem.MolFromMolBlock(kekule_json)
        mol = Chem.AddHs(mol)         
        if mol is None:
            return {"error": "Invalid Kekule JSON"}
        
        pattern = Chem.MolFromSmarts(smarts)
        if pattern is None:
            return {"error": "Invalid SMARTS"}
        
        matches = mol.GetSubstructMatches(pattern)
        # 将tuple转换为list
        matches = [list(match) for match in matches]
        
        # 获取所有匹配的原子索引
        all_atom_indices = set()
        for match in matches:
            all_atom_indices.update(match)
        
        return {
            "smarts": smarts,
            "match_count": len(matches),
            "matches": matches,
            "atom_indices": list(all_atom_indices),
            "matched": True if len(matches) > 0 else False
        }
    except Exception as e:
        return {"error": str(e), "matches": [], "matched":False}

def match_smarts_batch(smarts_list: list, mol_blocks: list) -> list:
    """批量子结构匹配。

    返回布尔矩阵 matched[i][j]：第 i 个 smarts 是否为第 j 个 molBlock 分子的子结构
    （方向与 find_smart_pattern_in_kekule_json 一致：DB 模式 ⊆ 用户分子）。

    每个 molBlock 与每个 smarts 各只解析一次；任何解析失败的行/列对应位置记 False，
    不抛异常，避免单个坏输入拖垮整批查询。
    """
    # 预解析用户分子（molBlock）——与单条逻辑保持一致，加氢
    mols = []
    for mb in mol_blocks:
        try:
            mol = Chem.MolFromMolBlock(mb)
            mols.append(Chem.AddHs(mol) if mol is not None else None)
        except Exception:
            mols.append(None)

    # 预解析 DB 模式（smarts）
    patterns = []
    for smarts in smarts_list:
        try:
            patterns.append(Chem.MolFromSmarts(smarts))
        except Exception:
            patterns.append(None)

    matched = []
    for pattern in patterns:
        row = []
        for mol in mols:
            if pattern is None or mol is None:
                row.append(False)
            else:
                row.append(len(mol.GetSubstructMatches(pattern)) > 0)
        matched.append(row)
    return matched


def _query_atom_charge(atom):
    """从 RDKit 查询原子提取「显式声明的形式电荷」；未声明电荷返回 None。

    关键区分：SMARTS 里 `[N]`（方括号但未写电荷）表示「电荷不指定」，会沿用
    反应物原子电荷；而 `[N+0]` 表示「显式声明电荷为 0」。二者在 DescribeQuery
    中的区别是是否出现 `AtomFormalCharge` 子句。
    """
    try:
        descr = atom.DescribeQuery()
    except Exception:
        return None
    m = re.search(r"AtomFormalCharge\s+([+-]?\d+)", descr)
    return int(m.group(1)) if m else None


def _query_atom_has_h_count(atom) -> bool:
    """判断查询原子是否显式声明了 H 计数（如 `[N;H2]`、`[cH]`）。"""
    try:
        smarts = atom.GetSmarts()
    except Exception:
        return False
    return bool(re.search(r"H\d", smarts))


def validate_reaction_smarts(rxn) -> list:
    """对 Reaction SMARTS 模板做确定性诊断，返回中文警告列表。

    重点检测两类反直觉的 SMARTS 书写问题：
    1. 反应物原子带电荷、产物同映射原子未声明电荷 —— RDKit 的 RunReactants 会把
       反应物电荷原样带到产物，导致超价态（如氨基负离子 N⁻ 生成中性 N 时，产物
       写成 `[N:3]` 而非 `[N+0:3]`）。
    2. 产物侧映射原子写了 H 计数（Hn）—— 后端对反应物 AddHs 后，显式 H 与 Hn
       叠加导致价态溢出。
    """
    warnings = []

    # 收集反应物各映射原子「显式声明的电荷」
    reactant_charge = {}
    for i in range(rxn.GetNumReactantTemplates()):
        tmpl = rxn.GetReactantTemplate(i)
        for a in tmpl.GetAtoms():
            mn = a.GetAtomMapNum()
            if mn <= 0:
                continue
            chg = _query_atom_charge(a)
            if chg is not None:
                reactant_charge[mn] = chg

    # 检查产物模板
    for i in range(rxn.GetNumProductTemplates()):
        tmpl = rxn.GetProductTemplate(i)
        for a in tmpl.GetAtoms():
            mn = a.GetAtomMapNum()
            if mn <= 0:
                continue
            sym = a.GetSymbol()
            chg = _query_atom_charge(a)

            # 1) 电荷沿用：反应物显式带电、产物未声明电荷
            if chg is None and mn in reactant_charge and reactant_charge[mn] != 0:
                warnings.append(
                    f"产物侧原子 {sym}(映射{mn}) 未声明电荷，会沿用反应物侧的 "
                    f"{reactant_charge[mn]:+d} 电荷，可能造成价态溢出；"
                    f"若该原子反应后为中性，请改写为 [{sym}+0:{mn}]。"
                )

            # 2) H 计数冗余：产物侧映射原子写了 Hn
            if _query_atom_has_h_count(a):
                warnings.append(
                    f"产物侧原子 {sym}(映射{mn}) 声明了 H 计数，会与后端 AddHs 产生的显式 "
                    f"氢原子叠加导致价态溢出，建议移除该 H 计数（如 [{sym}+0:{mn}]）。"
                )

    return warnings


def predict_products_of_reaction_smiles(smart: str, reactant_smiles_list: list) -> dict:
    """
    使用 Reaction SMARTS 和反应物 SMILES 列表推断产物。

    返回 dict:
      productSets:        [[molblock, ...], ...]  每个内层列表代表一组可能的产物
      error:              出错原因（SMARTS 无效 / 反应物无效 / 产物 sanitize 失败），成功为 None
      diagnostics:        模板层面的诊断警告（电荷沿用 / H 计数冗余）
      unmatchedReactants: 与所有反应物模板都不匹配的输入分子下标（前端用于红色标注）

    位置无关：RunReactants 按模板 LHS 顺序严格匹配反应物，因此这里遍历输入
    反应物的**所有排列**，任一排列能匹配模板即产出，用户无需按特定顺序摆放分子。
    产物集合按规范化 SMILES 去重（排列 + RDKit 对称匹配会产生大量重复）。
    """
    rxn = AllChem.ReactionFromSmarts(smart)
    if rxn is None:
        return {
            "productSets": [],
            "error": f"无效的 Reaction SMARTS：{smart}",
            "diagnostics": [],
            "unmatchedReactants": [],
        }

    diagnostics = validate_reaction_smarts(rxn)

    reactants = []
    for idx, smi in enumerate(reactant_smiles_list):
        mol = Chem.MolFromSmiles(smi)
        if mol is None:
            return {
                "productSets": [],
                "error": f"无效的反应物 SMILES：{smi}",
                "diagnostics": diagnostics,
                "unmatchedReactants": [idx],
            }
        reactants.append(Chem.AddHs(mol))

    seen = set()   # 已产出产物集的规范化指纹，用于去重
    result = []
    last_sanitize_error = None
    for perm in permutations(reactants):
        try:
            product_series = rxn.RunReactants(list(perm))
        except Exception:
            # 某个排列在 RDKit 内部报错（如原子数不匹配），跳过该排列
            continue

        for products in product_series:
            try:
                # RemoveHs 默认会 sanitize；RunReactants 的产物偶有价键异常，跳过
                cleaned = [Chem.RemoveHs(p) for p in products]
                key = tuple(Chem.MolToSmiles(m) for m in cleaned)
            except Exception as e:
                last_sanitize_error = str(e)
                continue

            if key in seen:
                continue
            seen.add(key)
            result.append([Chem.MolToMolBlock(m) for m in cleaned])

    error = None
    unmatched: list = []
    if not result:
        # 定位问题分子：与所有反应物模板都不匹配的输入分子即为嫌疑分子。
        # 只报"确定不匹配"的；分子都匹配但产物异常的情况交给 sanitize 报错。
        templates = [
            rxn.GetReactantTemplate(i) for i in range(rxn.GetNumReactantTemplates())
        ]
        for idx, mol in enumerate(reactants):
            try:
                if not any(mol.HasSubstructMatch(t) for t in templates):
                    unmatched.append(idx)
            except Exception:
                continue

        if last_sanitize_error:
            error = (
                f"产物生成失败（{last_sanitize_error}）。"
                f"若反应涉及带电物种，请检查产物侧是否显式声明了电荷（如 [N+0:3]），"
                f"以及是否写了多余的 H 计数。"
            )
        elif unmatched:
            joined = "、".join(str(i + 1) for i in unmatched)
            error = (
                f"未能推断出产物：反应物 {joined} 与该反应模式中的任何反应物模板都不匹配，"
                f"请检查所绘结构（注意氢原子与电荷是否完整）。"
            )
        else:
            error = "未能推断出产物，请检查反应物是否匹配该反应模式。"

    return {
        "productSets": result,
        "error": error,
        "diagnostics": diagnostics,
        "unmatchedReactants": unmatched,
    }