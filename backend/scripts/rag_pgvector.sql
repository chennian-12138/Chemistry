-- RAG pgvector 初始化 SQL
-- 用法（在目标数据库执行）：
--   psql "$DATABASE_URL" -f scripts/rag_pgvector.sql
-- 或由部署流程在 prisma db push 之后执行（db push 不会建 vector 扩展/HNSW 索引）。

CREATE EXTENSION IF NOT EXISTS vector;

-- HNSW 余弦相似度索引：bge-m3 的 1024 维向量。
-- 数据量小（~1000 块）时即便无索引全表扫也只有毫秒级，但先建好为增长留余地。
CREATE INDEX IF NOT EXISTS rag_chunk_embedding_hnsw_idx
  ON rag_chunk
  USING hnsw (embedding vector_cosine_ops);

-- 检索示例（Top-K 余弦相似度，返回值越大越相似）：
--   SELECT id, source_type, title, content, meta,
--          1 - (embedding <=> $query_vec::vector) AS score
--   FROM rag_chunk
--   WHERE embedding IS NOT NULL
--   ORDER BY embedding <=> $query_vec::vector
--   LIMIT 5;
