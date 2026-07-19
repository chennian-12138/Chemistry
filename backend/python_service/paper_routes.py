"""
文献爬取相关的 FastAPI 路由。
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/papers", tags=["papers"])


class FetchStatus(BaseModel):
    status: str
    message: str


@router.post("/trigger-initial", response_model=FetchStatus)
async def trigger_initial(background_tasks: BackgroundTasks):
    """
    手动触发首次全量爬取（近 10 年 Top 200/领域）。
    在后台执行，立即返回确认响应。
    """
    # 延迟导入，避免循环依赖
    from paper_fetcher import fetch_initial, load_subfields

    def _run():
        subfields = load_subfields()
        fetch_initial(subfields)

    background_tasks.add_task(_run)
    return FetchStatus(status="started", message="初始化爬取已在后台启动")


@router.post("/trigger-daily", response_model=FetchStatus)
async def trigger_daily(background_tasks: BackgroundTasks):
    """
    手动触发一次每日增量爬取（近 2 天新文章）。
    正常由 APScheduler 每 24 小时自动调用，此接口用于调试。
    """
    from paper_fetcher import fetch_daily, load_subfields

    def _run():
        subfields = load_subfields()
        fetch_daily(subfields)

    background_tasks.add_task(_run)
    return FetchStatus(status="started", message="每日增量爬取已在后台启动")
