from rdkit import Chem
from rdkit.Chem import Draw, AllChem
from rdkit.Chem.Draw import rdMolDraw2D
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

def predict_products_of_reaction_smiles(smart: str, reactant_smiles_list: list) -> list:
    """
    使用 Reaction SMARTS 和反应物 SMILES 列表推断产物。
    返回产物 MolBlock 的二维列表：[[molblock, ...], ...]
    每个内层列表代表一组可能的产物。
    """
    rxn = AllChem.ReactionFromSmarts(smart)
    if rxn is None:
        raise ValueError(f"Invalid Reaction SMARTS: {smart}")

    reactants = []
    for smi in reactant_smiles_list:
        mol = Chem.MolFromSmiles(smi)
        mol = Chem.AddHs(mol)
        if mol is None:
            raise ValueError(f"Invalid reactant SMILES: {smi}")
        reactants.append(mol)

    product_series = rxn.RunReactants(reactants)
    if len(product_series) == 0:
        return []

    result = []
    for products in product_series:
        product_mol_blocks = [Chem.MolToMolBlock(Chem.RemoveHs(product)) for product in products]
        result.append(product_mol_blocks)
    return result