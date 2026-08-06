"""
RAG 阶段1：批量向量化 + 写入 pgvector

读取 rag_chunk_md.py 产出的 chunks JSON，调用 SiliconFlow bge-m3 embedding API，
写入 PostgreSQL rag_chunk 表（pgvector）。

特性：
  - 分批处理（SiliconFlow bge-m3 单次请求上限 32 条，设 16 保险）
  - 幂等：已存在的 chunk id 跳过（UPDATE 未入库/失败的重试）
  - 断点续传：中途失败重跑即可，已入库的不会重复调用 API

用法：
  python3 backend/scripts/rag_embed.py \
      --chunks /tmp/opencode/rag_chunks.json \
      --env ../.env.development
"""

import argparse
import json
import os
import sys
import time
import urllib.parse
from pathlib import Path

import requests
import psycopg2

EMBEDDING_MODEL = "BAAI/bge-m3"
EMBEDDING_DIM = 1024
BATCH = 16  # bge-m3 单请求上限 32 条；16 保守且快
API_URL = "https://api.siliconflow.cn/v1/embeddings"


def load_dotenv(path: Path) -> dict:
    env = {}
    if path and path.exists():
        for line in path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def embed_batch(api_key: str, texts: list[str]) -> list[list[float]]:
    resp = requests.post(
        API_URL,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={"model": EMBEDDING_MODEL, "input": texts, "encoding_format": "float"},
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()["data"]
    # SiliconFlow 返回顺序与输入一致
    return [d["embedding"] for d in sorted(data, key=lambda x: x["index"])]


def pg_connect(database_url: str):
    r = urllib.parse.urlparse(database_url)
    dbname = r.path.lstrip("/")
    if "?" in dbname:
        dbname = dbname.split("?")[0]
    return psycopg2.connect(
        host=r.hostname, port=r.port or 5432, user=r.username,
        password=urllib.parse.unquote(r.password or ""), dbname=dbname,
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--chunks", required=True, help="rag_chunk_md.py 输出的 JSON")
    ap.add_argument("--env", default=None, help="dotenv 文件（取 DATABASE_URL / SILICONFLOW_API_KEY）")
    ap.add_argument("--api-key", default=None, help="直接指定 SiliconFlow API key（优先于 env）")
    args = ap.parse_args()

    env = load_dotenv(Path(args.env)) if args.env else {}
    api_key = args.api_key or env.get("SILICONFLOW_API_KEY") or os.environ.get("SILICONFLOW_API_KEY")
    database_url = env.get("DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not api_key:
        sys.exit("缺少 API key：用 --api-key 或 SILICONFLOW_API_KEY 环境变量")
    if not database_url:
        sys.exit("缺少 DATABASE_URL")

    chunks = json.loads(Path(args.chunks).read_text())
    print(f"chunks 总数: {len(chunks)}")

    conn = pg_connect(database_url)
    cur = conn.cursor()

    # 查已入库的 id（断点续传）
    cur.execute("SELECT id FROM rag_chunk")
    done_ids = {row[0] for row in cur.fetchall()}
    todo = [c for c in chunks if c["id"] not in done_ids]
    print(f"已入库: {len(done_ids)}, 待处理: {len(todo)}")

    inserted = 0
    for i in range(0, len(todo), BATCH):
        batch = todo[i : i + BATCH]
        texts = [c["content"] for c in batch]
        for attempt in range(4):  # 重试 3 次
            try:
                vectors = embed_batch(api_key, texts)
                break
            except Exception as e:
                if attempt == 3:
                    print(f"[失败] 批次 {i} 重试耗尽: {e}")
                    conn.rollback()
                    sys.exit(1)
                wait = 2 ** attempt
                print(f"  批次 {i} 失败({e}), {wait}s 后重试 ({attempt+1}/3)")
                time.sleep(wait)
        else:
            continue

        rows = []
        for c, vec in zip(batch, vectors):
            rows.append((
                c["id"], "TEXTBOOK", c["source"], c["title"], c["content"],
                json.dumps(c["meta"], ensure_ascii=False), vec,
            ))
        cur.executemany(
            """
            INSERT INTO rag_chunk (id, source_type, source, title, content, meta, embedding)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                content = EXCLUDED.content,
                embedding = EXCLUDED.embedding,
                updated_at = now()
            """,
            rows,
        )
        conn.commit()
        inserted += len(batch)
        print(f"  进度: {inserted}/{len(todo)} ({i+len(batch)}/{len(todo)})")

    cur.close()
    conn.close()
    print(f"\n完成。本次入库 {inserted} 条，表内总计 {len(done_ids) + inserted} 条")


if __name__ == "__main__":
    main()
