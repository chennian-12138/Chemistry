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
        mol = Chem.MolFromJson(kekule_json)
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
            "matched": True
        }
    except Exception as e:
        return {"error": str(e), "matches": [], "matched":False}