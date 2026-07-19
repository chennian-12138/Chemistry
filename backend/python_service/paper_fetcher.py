"""
PyAlex 文献爬取逻辑。

两种模式：
  - fetch_initial: 每个 subfield 取近 10 年引用量 Top 200（首次初始化）
  - fetch_daily:   每个 subfield 取近 2 天发表的新文章（每日增量）
"""

import os
import csv
from datetime import datetime, timedelta

import pyalex
from pyalex import Works

from db import upsert_subfields, bulk_upsert_papers
from paper_filter import filter_papers
from journal_metrics import get_metrics

# ---------- PyAlex 配置 ----------
pyalex.config.email = "1990493833@qq.com"
pyalex.config.max_retries = 3
pyalex.config.retry_backoff_factor = 0.5

# ---------- CSV 加载 ----------

def load_subfields() -> list[dict]:
    """读取 subfields_filter.csv，返回 subfield 列表。"""
    base = os.path.dirname(os.path.abspath(__file__))
    # 优先 backend/data/（构建上下文内，Docker 可用），回退仓库根（本地遗留）
    csv_path = os.path.join(base, "..", "data", "subfields_filter.csv")
    if not os.path.exists(csv_path):
        csv_path = os.path.join(base, "..", "..", "subfields_filter.csv")
    subfields = []
    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            subfields.append({
                "id": row["id"].strip(),
                "display_name": row["display_name"].strip(),
                "display_name_zh": row["display_name_zh"].strip(),
            })
    return subfields


# ---------- 辅助函数 ----------

def _openalex_url(subfield_id: str) -> str:
    """将 'subfields/1605' 转换为完整 OpenAlex URL。"""
    return f"https://openalex.org/{subfield_id}"


def _reconstruct_abstract(inverted_index: dict | None) -> str | None:
    """将 OpenAlex 倒排索引格式的摘要还原为普通文本。"""
    if not inverted_index:
        return None
    word_at_pos: dict[int, str] = {}
    for word, positions in inverted_index.items():
        for pos in positions:
            word_at_pos[pos] = word
    if not word_at_pos:
        return None
    return " ".join(word_at_pos[i] for i in sorted(word_at_pos))


def _map_type(raw_type: str | None) -> str | None:
    """将 OpenAlex type 值映射为展示用类型。"""
    if not raw_type:
        return None
    mapping = {"article": "Article", "review": "Review"}
    return mapping.get(raw_type.lower(), raw_type.capitalize())


def _extract_authors(authorships: list) -> dict | None:
    """提取第一作者、最后作者和第一作者所属机构。"""
    if not authorships:
        return None
    first = authorships[0]
    last = authorships[-1] if len(authorships) > 1 else {}

    def author_name(a: dict) -> str:
        return (a.get("author") or {}).get("display_name") or ""

    def institution_name(a: dict) -> str:
        insts = a.get("institutions") or []
        return insts[0].get("display_name", "") if insts else ""

    return {
        "firstAuthor": author_name(first),
        "lastAuthor": author_name(last),
        "institution": institution_name(first),
    }


def _parse_work(work: dict) -> dict:
    """将 OpenAlex Work 对象转换为数据库写入格式。"""
    # DOI
    doi = work.get("doi")  # 已是完整 URL，如 "https://doi.org/10.xxx"

    # 跳转链接：优先 DOI，其次 OpenAlex landing_page_url
    primary_loc = (work.get("primary_location") or {})
    landing = doi or primary_loc.get("landing_page_url") or work.get("id")

    # 期刊 + 指标（JCR 分区 / 影响因子）
    source = primary_loc.get("source") or {}
    journal = source.get("display_name")
    metrics = get_metrics(journal)

    # 发表日期
    pub_date_str = work.get("publication_date")
    pub_date = None
    if pub_date_str:
        try:
            pub_date = datetime.strptime(pub_date_str, "%Y-%m-%d")
        except ValueError:
            pass

    return {
        "openalex_id": work.get("id", ""),          # e.g. "https://openalex.org/W123"
        "doi": doi,
        "title": (work.get("title") or "").strip(),
        "abstract": _reconstruct_abstract(work.get("abstract_inverted_index")),
        "journal_name": journal,
        "jcr_quartile": metrics["jcr_quartile"],
        "impact_factor": metrics["impact_factor"],
        "published_date": pub_date,
        "landing_page_url": landing,
        "authors": _extract_authors(work.get("authorships") or []),
        "article_type": _map_type(work.get("type")),
    }


# ---------- 爬取任务 ----------

def _fetch_for_subfield(
    subfield_id: str,
    filter_extra: dict,
    work_type: str = "article|review",
    n_max: int = 200,
) -> list[dict]:
    """
    为单个 subfield 执行 OpenAlex 查询，按引用量降序拉取至多 n_max 篇。
    work_type: OpenAlex type 过滤（如 "article" / "review" / "article|review"）。
    n_max > 200 时自动游标翻页（每页 200）。
    filter_extra 用于附加过滤条件（如日期范围）。
    """
    openalex_id = _openalex_url(subfield_id)
    try:
        query = (
            Works()
            .filter(
                **{"primary_topic.subfield.id": openalex_id},
                type=work_type,
                **filter_extra,
            )
            .sort(cited_by_count="desc")
        )

        works: list[dict] = []
        if n_max <= 200:
            works = query.get(per_page=200)[:n_max]
        else:
            # 游标翻页，逐页累积直到达到 n_max
            for page in query.paginate(per_page=200, n_max=n_max):
                works.extend(page)
                if len(works) >= n_max:
                    break
            works = works[:n_max]

        parsed = [_parse_work(w) for w in works if w.get("title")]
        return filter_papers(parsed)
    except Exception as e:
        print(f"[fetcher] subfield {subfield_id} 查询失败: {e}")
        return []


# 初始化：每个 subfield、每种类型各取引用量 Top N
INITIAL_TOP_N_PER_TYPE = 1000

def fetch_initial(subfields: list[dict]) -> None:
    """
    首次初始化：每个 subfield 拉取近 3 年内 Article / Review 各引用量 Top 1000。
    Article、Review 分开查询，避免高引 Review 挤占 Article 名额。
    加 to_publication_date = 今日，屏蔽 OpenAlex 中存在的未来日期数据。
    """
    three_years_ago = (datetime.now() - timedelta(days=365 * 3)).strftime("%Y-%m-%d")
    today = datetime.now().strftime("%Y-%m-%d")
    print(
        f"[fetcher] 开始初始化爬取（{len(subfields)} 个领域，{three_years_ago} ~ {today}，"
        f"每领域 Article/Review 各 Top {INITIAL_TOP_N_PER_TYPE}）"
    )

    date_filter = {"from_publication_date": three_years_ago, "to_publication_date": today}
    total = 0
    for sf in subfields:
        sf_total = 0
        for work_type in ("article", "review"):
            papers = _fetch_for_subfield(
                sf["id"],
                date_filter,
                work_type=work_type,
                n_max=INITIAL_TOP_N_PER_TYPE,
            )
            inserted = bulk_upsert_papers(papers, sf["id"])
            sf_total += inserted
            print(
                f"[fetcher] {sf['display_name_zh']}（{sf['id']}）"
                f"[{work_type}]: 获取 {len(papers)} 篇，新增 {inserted} 篇"
            )
        total += sf_total

    print(f"[fetcher] 初始化完成，共新增 {total} 篇文献")


def fetch_daily(subfields: list[dict]) -> None:
    """
    每日增量：每个 subfield 拉取近 2 天发表的新文章。
    加 to_publication_date = 今日，同样屏蔽未来日期。
    """
    two_days_ago = (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d")
    today = datetime.now().strftime("%Y-%m-%d")
    print(f"[fetcher] 开始每日增量爬取（{len(subfields)} 个领域，{two_days_ago} ~ {today}）")

    total = 0
    for sf in subfields:
        papers = _fetch_for_subfield(
            sf["id"],
            {"from_publication_date": two_days_ago, "to_publication_date": today},
        )
        inserted = bulk_upsert_papers(papers, sf["id"])
        total += inserted

    print(f"[fetcher] 每日增量完成，共新增 {total} 篇文献")
