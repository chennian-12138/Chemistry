"""逆合成分析相关的 FastAPI 路由。"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from retrosynthesis import (
    expand_one,
    template_count,
    match_molecules,
    reload_templates,
)

router = APIRouter(prefix="/api/retro", tags=["retrosynthesis"])


class ExpandRequest(BaseModel):
    smiles: str
    maxResults: int = 25


class PrecursorSet(BaseModel):
    templateId: str
    templateName: str
    templateSmarts: str
    precursors: List[str]


class ExpandResponse(BaseModel):
    target: str
    precursorSets: List[PrecursorSet] = []
    count: int = 0
    error: Optional[str] = None


@router.get("/health")
async def health():
    """健康检查 + 已加载模板数量（首次调用会触发模板加载）。"""
    return {"status": "ok", "templateCount": template_count()}


@router.post("/reload-templates")
async def reload_templates_route():
    """清空模板缓存并从数据库重新加载（新反应审核通过后热刷，无需重启服务）。"""
    return {"status": "ok", "templateCount": reload_templates()}


@router.post("/expand-one", response_model=ExpandResponse)
async def expand_one_route(req: ExpandRequest):
    """对单个分子做一步逆合成展开，返回可用的断键方法与前驱体。"""
    result = expand_one(req.smiles, max_results=req.maxResults)
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    return result


class Candidate(BaseModel):
    id: str
    smiles: str


class MatchRoutesRequest(BaseModel):
    query: str
    mode: str = "substructure"
    candidates: List[Candidate] = []


@router.post("/match-routes")
async def match_routes_route(req: MatchRoutesRequest):
    """结构搜索：返回候选分子中与 query 匹配的 id 列表。"""
    cands = [{"id": c.id, "smiles": c.smiles} for c in req.candidates]
    ids = match_molecules(req.query, req.mode, cands)
    return {"ids": ids}
