"""
文献入库过滤规则。
所有屏蔽逻辑在此统一维护，fetcher 与 db 层均可调用。

规则：
  1. 期刊名以屏蔽前缀开头（如 Zenodo）
  2. landing_page_url 或 doi 包含屏蔽域名 —— 弥补规则 1 的漏网情况
     （Zenodo 论文的 source 字段常为 None，导致 journal_name 为空，但 URL 必然含 zenodo.org）
  3. 发表日期超过当前时间
     （OpenAlex API 的 to_publication_date 过滤对脏数据不可靠，必须在解析后二次校验）
"""

from datetime import datetime


# ---------- 规则参数（需要新增屏蔽项时只改这里）----------

# 期刊名屏蔽前缀，大小写不敏感
BLOCKED_JOURNAL_PREFIXES: tuple[str, ...] = ("zenodo",)

# URL 屏蔽关键词，匹配 landing_page_url 与 doi，大小写不敏感
BLOCKED_URL_KEYWORDS: tuple[str, ...] = ("zenodo.org",)


# ---------- 单项检查 ----------

def _is_blocked_journal(journal_name: str | None) -> bool:
    """期刊名是否命中屏蔽前缀列表。"""
    if not journal_name:
        return False
    return journal_name.strip().lower().startswith(BLOCKED_JOURNAL_PREFIXES)


def _is_blocked_url(url: str | None) -> bool:
    """URL 是否包含屏蔽关键词（journal_name 为空时的补充检查）。"""
    if not url:
        return False
    lower = url.strip().lower()
    return any(kw in lower for kw in BLOCKED_URL_KEYWORDS)


def _is_future_dated(pub_date: datetime | None) -> bool:
    """发表日期是否超过当前时间。"""
    if pub_date is None:
        return False
    return pub_date > datetime.now()


# ---------- 主入口 ----------

def should_reject(paper: dict) -> bool:
    """
    判断一篇文献是否应被拒绝入库。
    paper 为 _parse_work 输出的字典格式，返回 True 表示拒绝。
    """
    # 规则 1：期刊名屏蔽
    if _is_blocked_journal(paper.get("journal_name")):
        return True
    # 规则 2：URL 屏蔽（Zenodo 论文 journal_name 为 None 时的补充）
    if _is_blocked_url(paper.get("landing_page_url")) or _is_blocked_url(paper.get("doi")):
        return True
    # 规则 3：未来日期二次校验
    if _is_future_dated(paper.get("published_date")):
        return True
    return False


def filter_papers(papers: list[dict]) -> list[dict]:
    """
    对文献列表应用全部过滤规则，返回通过的文献。
    拦截数量 > 0 时打印日志，方便追踪数据质量问题。
    """
    passed = [p for p in papers if not should_reject(p)]
    rejected = len(papers) - len(passed)
    if rejected:
        print(f"[filter] 拦截 {rejected}/{len(papers)} 篇（Zenodo 或日期异常）")
    return passed
