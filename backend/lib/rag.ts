import "./env";
import { prisma } from "./prisma";
import { Prisma } from "../generated/prisma/client";

// RAG 检索服务：教科书切片 + reactions 反应库的工具查询。
// 向量检索走 pgvector（embedding 列为 Unsupported，Prisma 无法表达，需 raw SQL）。

const EMBEDDING_MODEL = "BAAI/bge-m3";
const EMBEDDING_API_URL = "https://api.siliconflow.cn/v1/embeddings";
const EMBEDDING_DIM = 1024;

// 检索 Top-K：教科书向量检索取多少条
const RAG_TOP_K = 5;
// 相似度下限：低于该分数视为无关，不注入
const RAG_MIN_SCORE = 0.45;

export interface RagHit {
  title: string;
  content: string;
  source: string;
  meta: Record<string, unknown>;
  score: number;
}

// 把一条文本 embedding 成 1024 维向量（SiliconFlow bge-m3）。
// 批量/运行时统一走此模型，保证向量空间一致。
export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.SILICONFLOW_API_KEY;
  if (!apiKey) throw new Error("未配置 SILICONFLOW_API_KEY");

  const resp = await fetch(EMBEDDING_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
      encoding_format: "float",
    }),
  });
  if (!resp.ok) {
    throw new Error(`embedding API 调用失败: ${resp.status} ${resp.statusText}`);
  }
  const data = (await resp.json()) as {
    data: { index: number; embedding: number[] }[];
  };
  return data.data[0]?.embedding ?? [];
}

// 向量检索：教科书/其他向量化内容，按余弦相似度取 Top-K。
// 通过 raw SQL 访问 pgvector 列（Prisma 不支持 vector 类型）。
export async function vectorSearch(
  queryVec: number[],
  topK: number = RAG_TOP_K,
  minScore: number = RAG_MIN_SCORE,
): Promise<RagHit[]> {
  if (queryVec.length !== EMBEDDING_DIM) {
    throw new Error(`embedding 维度错误: 期望 ${EMBEDDING_DIM}, 实际 ${queryVec.length}`);
  }
  const vecStr = `[${queryVec.map((v) => v.toFixed(6)).join(",")}]`;

  // 参数化：把向量字符串作为参数传入，避免内联 SQL 注入风险
  const sql = Prisma.sql`
    SELECT id, title, source, content, meta,
           (1 - (embedding <=> ${vecStr}::vector)) AS score
    FROM rag_chunk
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${vecStr}::vector
    LIMIT ${topK}
  `;
  const rows = await prisma.$queryRaw<{
    id: string;
    title: string;
    source: string;
    content: string;
    meta: Record<string, unknown>;
    score: number;
  }[]>(sql);

  return rows
    .filter((r) => Number(r.score) >= minScore)
    .map((r) => ({
      title: r.title,
      content: r.content,
      source: r.source,
      meta: r.meta ?? {},
      score: Number(r.score),
    }));
}

// 完整检索入口：用户消息 → embedding → 向量检索 → 结构化上下文。
// 返回 null 表示检索无可用内容（不注入）。
export async function retrieveContext(
  userMessage: string,
): Promise<{ hits: RagHit[]; contextText: string } | null> {
  try {
    const queryVec = await embedText(userMessage);
    const hits = await vectorSearch(queryVec);
    if (hits.length === 0) return null;

    // 上下文只注入纯内容，不含书名/章节/标题等任何来源信息，
    // 避免模型在回答中附带引用标注
    const contextText = hits.map((h) => h.content).join("\n\n");
    return { hits, contextText };
  } catch (err) {
    // 检索失败不应阻断对话主流程：记录后降级为无 RAG 上下文
    console.error("[rag] retrieveContext error:", err);
    return null;
  }
}
