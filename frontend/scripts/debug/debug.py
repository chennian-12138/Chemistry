import sys
import json
from rdkit_utils import find_smart_pattern_in_kekule_json

with open("frontend/scripts/test.json", "r") as f:
    data = json.loads(f.read())

smarts = data["smarts"]
mol_json = data["mol_json"]

if __name__ == "__main__":
    # if len(sys.argv) != 3:
    #     print(json.dumps({"error": "缺少参数，你给的是三个吗就在这里叫"}))
    #     sys.exit(1)

    # smarts =sys.argv[1]
    # mol_json = sys.argv[2]
    try:
        result = find_smart_pattern_in_kekule_json(smarts, mol_json)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)