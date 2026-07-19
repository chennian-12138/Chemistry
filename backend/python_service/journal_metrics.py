"""
期刊指标（JCR 分区 + 影响因子）加载模块。
数据来源：仓库根目录的 journals_with_if.csv
    列：journal_name, jcr_quartile, impact_factor

对外提供 get_metrics(journal_name) -> {"jcr_quartile", "impact_factor"}，
用于爬虫写库时补充期刊指标；缺失字段返回 None。
按期刊名精确匹配（大小写、首尾空格归一化）。
"""

import os
import csv
from functools import lru_cache

_CSV_NAME = "journals_with_if.csv"


def _csv_path() -> str:
    base = os.path.dirname(os.path.abspath(__file__))
    # 优先 backend/data/（构建上下文内，Docker 可用），回退仓库根（本地遗留）
    p = os.path.join(base, "..", "data", _CSV_NAME)
    if not os.path.exists(p):
        p = os.path.join(base, "..", "..", _CSV_NAME)
    return p


def _norm(name: str | None) -> str:
    return (name or "").strip().lower()


@lru_cache(maxsize=1)
def _load_map() -> dict[str, dict]:
    """读取 CSV，构建 归一化期刊名 -> {jcr_quartile, impact_factor} 映射。"""
    result: dict[str, dict] = {}
    path = _csv_path()
    if not os.path.exists(path):
        print(f"[journal_metrics] 未找到 {path}，指标将全部为空")
        return result
    with open(path, newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            key = _norm(row.get("journal_name"))
            if not key:
                continue
            q = (row.get("jcr_quartile") or "").strip() or None
            raw_if = (row.get("impact_factor") or "").strip()
            try:
                impact = float(raw_if) if raw_if else None
            except ValueError:
                impact = None
            result[key] = {"jcr_quartile": q, "impact_factor": impact}
    print(f"[journal_metrics] 已加载 {len(result)} 个期刊指标")
    return result


def get_metrics(journal_name: str | None) -> dict:
    """按期刊名返回 {'jcr_quartile', 'impact_factor'}，无匹配则均为 None。"""
    if not journal_name:
        return {"jcr_quartile": None, "impact_factor": None}
    return _load_map().get(
        _norm(journal_name), {"jcr_quartile": None, "impact_factor": None}
    )
