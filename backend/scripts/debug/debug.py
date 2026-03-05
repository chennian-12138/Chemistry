# import sys
# import json
# from rdkit_utils import find_smart_pattern_in_kekule_json

# with open("frontend/scripts/test.json", "r") as f:
#     data = json.loads(f.read())

# smarts = data["smarts"]
# mol_json = data["mol_json"]

# if __name__ == "__main__":
#     # if len(sys.argv) != 3:
#     #     print(json.dumps({"error": "缺少参数，你给的是三个吗就在这里叫"}))
#     #     sys.exit(1)

#     # smarts =sys.argv[1]
#     # mol_json = sys.argv[2]
#     try:
#         result = find_smart_pattern_in_kekule_json(smarts, mol_json)
#         print(json.dumps(result))
#     except Exception as e:
#         print(json.dumps({"error": str(e)}))
#         sys.exit(1)

from rdkit import Chem
from rdkit.chem import AllChem

# 1. 定义反应 SMARTS (包含映射关系)
# 这里我们匹配一个带有氢的饱和碳连接一个带有溴的饱和碳
rxn_smarts = '[CX4:1](-[H:3])-[CX4:2](-[Br:4])>>[C:1]=[C:2]'
rxn = AllChem.ReactionFromSmarts(rxn_smarts)

# 2. 准备反应物：2-溴丁烷
mol = Chem.MolFromSmiles('CCC(Br)C')

# 重要步骤：必须添加显式氢，否则 SMARTS 中的 [H:3] 无法匹配到分子中的隐式氢
mol_with_hs = Chem.AddHs(mol)

# 3. 运行反应
# RunReactants 返回的是一个元组的元组，因为一个反应可能由于对称性或位点产生多个产物
products = rxn.RunReactants((mol_with_hs,))

# 4. 提取并清理产物
unique_smiles = set()
for prod_tuple in products:
    for prod in prod_tuple:
        # 移除反应过程中多余的氢，转回标准 SMILES
        clean_prod = Chem.RemoveHs(prod)
        unique_smiles.add(Chem.MolToSmiles(clean_prod))

# 5. 输出结果
print(f"反应物: 2-溴丁烷 (SMILES: {Chem.MolToSmiles(mol)})")
print(f"消除产物数量: {len(unique_smiles)}")
for i, smiles in enumerate(unique_smiles):
    print(f"产物 {i+1}: {smiles}")