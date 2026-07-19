from contextlib import asynccontextmanager
import threading

from fastapi import FastAPI
from apscheduler.schedulers.background import BackgroundScheduler

from rdkit_utils import (
    find_smart_pattern_in_kekule_json,
    predict_products_of_reaction_smiles
)
from paper_routes import router as paper_router


# ---------- 启动/关闭生命周期 ----------

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- 启动 ---
    _startup()
    yield
    # --- 关闭 ---
    if _scheduler.running:
        _scheduler.shutdown(wait=False)


_scheduler = BackgroundScheduler()


def _startup():
    """
    服务启动时：
    1. 将 CSV 里的 subfield 记录 upsert 到数据库（保持同步）
    2. 若 paper 表为空，则在后台线程触发一次全量初始化爬取
       （放后台线程，避免阻塞 FastAPI 启动 —— 适配 Docker 部署）
    3. 注册每日增量爬取定时任务（每 24 小时）
    """
    from paper_fetcher import load_subfields, fetch_daily, fetch_initial
    from db import upsert_subfields, count_papers

    subfields = load_subfields()
    try:
        upsert_subfields(subfields)
    except Exception as e:
        print(f"[startup] subfield seed 失败: {e}")

    # 数据库为空 → 后台自动初始化，无需手动触发
    try:
        existing = count_papers()
        if existing == 0:
            print("[startup] paper 表为空，将在后台启动全量初始化爬取")

            def _init_job():
                try:
                    fetch_initial(load_subfields())
                except Exception as e:
                    print(f"[startup] 初始化爬取失败: {e}")

            threading.Thread(target=_init_job, daemon=True).start()
        else:
            print(f"[startup] paper 表已有 {existing} 篇文献，跳过初始化")
    except Exception as e:
        print(f"[startup] 检查 paper 数量失败，跳过自动初始化: {e}")

    def _daily_job():
        try:
            fetch_daily(load_subfields())
        except Exception as e:
            print(f"[scheduler] 每日爬取失败: {e}")

    _scheduler.add_job(_daily_job, "interval", hours=24, id="daily_fetch")
    _scheduler.start()
    print("[scheduler] 每日文献爬取任务已注册（间隔 24h）")


# ---------- FastAPI 应用 ----------

app = FastAPI(title="RDKit Chemistry Service", lifespan=lifespan)

app.include_router(paper_router)


# ---------- 原有路由 ----------

from fastapi import HTTPException
from pydantic import BaseModel
from typing import List, Optional


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
    import uvicorn
    # 使用 5000 端口，避开 Node 的 8000 和前端的 3000
    uvicorn.run(app, host="127.0.0.1", port=5000)
