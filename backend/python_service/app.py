from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
from rdkit_utils import (
    find_smart_pattern_in_kekule_json,
    predict_products_of_reaction_smiles
)

app = FastAPI(title="RDKit Chemistry Service")

# ---------- Models ----------
class MatchRequest(BaseModel):
    smarts: str
    molBlock: str

class MatchResponse(BaseModel):
    smarts: str
    match_count: int = 0
    matches: List[List[int]] = []
    atom_indices: List[int] = []
    matched: bool = False
    error: Optional[str] = None

class PredictRequest(BaseModel):
    reactionSmarts: str
    smilesList: List[str]

class PredictResponse(BaseModel):
    productSets: List[List[str]] = []
    error: Optional[str] = None

# ---------- Routes ----------
@app.post("/api/match-smarts")
async def match_smarts(request: MatchRequest):
    try:
        result = find_smart_pattern_in_kekule_json(request.smarts, request.molBlock)
        if "error" in result:
             raise HTTPException(status_code=400, detail=result["error"])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/predict-products")
async def predict_products_route(request: PredictRequest):
    try:
        result = predict_products_of_reaction_smiles(request.reactionSmarts, request.smilesList)
        return {"productSets": result}
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # 使用 5000 端口，避开 Node的 8000 和前端的 3000
    uvicorn.run(app, host="127.0.0.1", port=5000)
