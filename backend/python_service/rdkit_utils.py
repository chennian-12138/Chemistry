from rdkit import Chem
from rdkit.Chem import Draw, AllChem
from rdkit.Chem.Draw import rdMolDraw2D
from itertools import permutations
import json

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


def predict_products_of_reaction_smiles(smart: str, reactant_smiles_list: list) -> list:
    """
    使用 Reaction SMARTS 和反应物 SMILES 列表推断产物。
    返回产物 MolBlock 的二维列表：[[molblock, ...], ...]
    每个内层列表代表一组可能的产物。

    位置无关：RunReactants 按模板 LHS 顺序严格匹配反应物，因此这里遍历输入
    反应物的**所有排列**，任一排列能匹配模板即产出，用户无需按特定顺序摆放分子。
    产物集合按规范化 SMILES 去重（排列 + RDKit 对称匹配会产生大量重复）。
    """
    rxn = AllChem.ReactionFromSmarts(smart)
    if rxn is None:
        raise ValueError(f"Invalid Reaction SMARTS: {smart}")

    reactants = []
    for smi in reactant_smiles_list:
        mol = Chem.MolFromSmiles(smi)
        if mol is None:
            raise ValueError(f"Invalid reactant SMILES: {smi}")
        reactants.append(Chem.AddHs(mol))

    seen = set()   # 已产出产物集的规范化指纹，用于去重
    result = []
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
            except Exception:
                continue

            if key in seen:
                continue
            seen.add(key)
            result.append([Chem.MolToMolBlock(m) for m in cleaned])

    return result