import sys
import json
from rdkit_utils import predict_products_of_reaction_smiles

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(json.dumps({"error": "需要两个参数: Reaction SMARTS 和 SMILES 列表 (JSON)"}))
        sys.exit(1)

    smart = sys.argv[1]
    try:
        smiles_list = json.loads(sys.argv[2])
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"SMILES 列表 JSON 解析失败: {str(e)}"}))
        sys.exit(1)

    try:
        result = predict_products_of_reaction_smiles(smart, smiles_list)
        print(json.dumps({"productSets": result}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
