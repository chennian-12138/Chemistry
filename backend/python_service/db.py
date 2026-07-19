"""
数据库连接与纸质文献相关的写入辅助函数。
使用 psycopg2 直连 PostgreSQL，复用 DATABASE_URL 环境变量。
"""

import os
import json
import uuid
from contextlib import contextmanager
from urllib.parse import urlparse

import psycopg2
import psycopg2.extras

from paper_filter import filter_papers


def _conn_params() -> dict:
    url = os.environ.get("DATABASE_URL", "")
    r = urlparse(url)
    dbname = r.path.lstrip("/")
    if "?" in dbname:
        dbname = dbname.split("?")[0]
    return dict(
        host=r.hostname,
        port=r.port or 5432,
        user=r.username,
        password=r.password,
        dbname=dbname,
    )


@contextmanager
def get_conn():
    """上下文管理器：获取连接，成功时提交，异常时回滚。"""
    conn = psycopg2.connect(**_conn_params())
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def new_id() -> str:
    """生成一个随机唯一 ID（与 Prisma cuid String 类型兼容）。"""
    return uuid.uuid4().hex


# ---------- Count ----------

def count_papers() -> int:
    """返回 paper 表当前的记录总数。"""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM paper")
            row = cur.fetchone()
            return int(row[0]) if row else 0


# ---------- Subfield seed ----------

def upsert_subfields(subfields: list[dict]) -> None:
    """
    将 CSV 里的 subfield 记录 upsert 到 paper_subfield 表。
    每次服务启动时调用，保持与 CSV 同步。

    subfields 格式：[{"id": "subfields/1605", "display_name": "...", "display_name_zh": "..."}]
    """
    if not subfields:
        return
    with get_conn() as conn:
        with conn.cursor() as cur:
            for sf in subfields:
                cur.execute(
                    """
                    INSERT INTO paper_subfield (id, display_name, display_name_zh)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (id) DO UPDATE
                        SET display_name    = EXCLUDED.display_name,
                            display_name_zh = EXCLUDED.display_name_zh
                    """,
                    (sf["id"], sf["display_name"], sf["display_name_zh"]),
                )
    print(f"[db] subfields upserted: {len(subfields)} rows")


# ---------- Paper upsert ----------

def upsert_paper(paper: dict, subfield_id: str) -> None:
    """
    将单篇文献写入数据库（已存在则跳过），并建立与 subfield 的关联。

    paper 字段：
        openalex_id, doi, title, abstract, journal_name,
        published_date, landing_page_url, authors (dict), article_type
    """
    pid = new_id()
    authors_json = json.dumps(paper.get("authors")) if paper.get("authors") else None

    with get_conn() as conn:
        with conn.cursor() as cur:
            # 插入 paper，冲突时忽略（dedup by openalex_id）
            cur.execute(
                """
                INSERT INTO paper (
                    id, openalex_id, doi, title, abstract,
                    journal_name, jcr_quartile, impact_factor,
                    published_date, landing_page_url,
                    authors, article_type, like_count, fetched_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 0, NOW())
                ON CONFLICT (openalex_id) DO NOTHING
                RETURNING id
                """,
                (
                    pid,
                    paper["openalex_id"],
                    paper.get("doi"),
                    paper["title"],
                    paper.get("abstract"),
                    paper.get("journal_name"),
                    paper.get("jcr_quartile"),
                    paper.get("impact_factor"),
                    paper.get("published_date"),
                    paper.get("landing_page_url"),
                    authors_json,
                    paper.get("article_type"),
                ),
            )
            row = cur.fetchone()

            # 如果 DO NOTHING 触发，取已有 id
            if row is None:
                cur.execute(
                    "SELECT id FROM paper WHERE openalex_id = %s",
                    (paper["openalex_id"],),
                )
                row = cur.fetchone()

            if row is None:
                return

            actual_id = row[0]

            # 建立 paper <-> subfield 多对多关联（Prisma implicit join table）
            cur.execute(
                """
                INSERT INTO "_PaperToPaperSubfield" ("A", "B")
                VALUES (%s, %s)
                ON CONFLICT DO NOTHING
                """,
                (actual_id, subfield_id),
            )


def bulk_upsert_papers(papers: list[dict], subfield_id: str) -> int:
    """
    批量写入文献，返回实际新增数量（跳过已存在的）。
    在写入前应用 filter_papers 作为最后一道防线。
    每篇独立处理，单篇报错不中断整批。
    """
    papers = filter_papers(papers)
    inserted = 0
    for p in papers:
        try:
            upsert_paper(p, subfield_id)
            inserted += 1
        except Exception as e:
            print(f"[db] skip paper {p.get('openalex_id')}: {e}")
    return inserted
