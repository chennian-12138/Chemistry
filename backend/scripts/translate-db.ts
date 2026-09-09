#!/usr/bin/env tsx
/**
 * 批量翻译数据库中的中文业务内容为英文，写入各表的 translations JSON。
 *
 * 覆盖内容：
 *   - reaction.name
 *   - reaction_tag.name
 *   - reaction_pattern.name
 *   - molecule_role.name
 *   - section_description.description
 *
 * 支持在本地和服务器上运行：
 *   npx tsx scripts/translate-db.ts                     # 翻译所有缺失英文的记录
 *   npx tsx scripts/translate-db.ts --entity reaction    # 只翻译反应名称
 *   npx tsx scripts/translate-db.ts --limit 100          # 只处理 100 条
 *   npx tsx scripts/translate-db.ts --dry-run            # 不调 API 不入库
 *
 * 模型从 env 读取：LLM_MODEL=deepseek-v4-flash，并显式关闭思考模式。
 */
import "../lib/env";
import OpenAI from "openai";
import { prisma } from "../lib/prisma";

const MODEL = process.env.LLM_MODEL || "deepseek-v4-flash";
const BATCH_SIZE = Number(process.env.TRANSLATE_BATCH_SIZE || 20);
const LIMIT = Number(process.env.TRANSLATE_LIMIT || Infinity);

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArgIndex = args.indexOf("--limit");
const limit = limitArgIndex >= 0 ? Number(args[limitArgIndex + 1]) : LIMIT;
const entityFlagIndex = args.indexOf("--entity");
const entity = entityFlagIndex >= 0 ? args[entityFlagIndex + 1] : "all";

function getClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.LLM_API_KEY,
    baseURL: process.env.LLM_BASE_URL || "https://api.deepseek.com",
  });
}

type EntityType =
  | "reaction"
  | "tag"
  | "pattern"
  | "molecule"
  | "description";

interface EntityConfig {
  key: EntityType;
  label: string;
  field: "name" | "description";
  // 使用 any 便于脚本读取不同 Prisma model
  findMany: (args: any) => Promise<any[]>;
  update: (id: string, translations: any) => Promise<any>;
}

function entityConfigs(): EntityConfig[] {
  const models = {
    reaction: {
      key: "reaction",
      label: "反应",
      field: "name",
      findMany: (args: any) => prisma.reaction.findMany(args),
      update: (id: string, translations: any) =>
        prisma.reaction.update({ where: { id }, data: { translations } }),
    },
    tag: {
      key: "tag",
      label: "标签",
      field: "name",
      findMany: (args: any) => prisma.reactionTag.findMany(args),
      update: (id: string, translations: any) =>
        prisma.reactionTag.update({ where: { id }, data: { translations } }),
    },
    pattern: {
      key: "pattern",
      label: "反应模式",
      field: "name",
      findMany: (args: any) => prisma.reactionPattern.findMany(args),
      update: (id: string, translations: any) =>
        prisma.reactionPattern.update({ where: { id }, data: { translations } }),
    },
    molecule: {
      key: "molecule",
      label: "分子角色",
      field: "name",
      findMany: (args: any) => prisma.moleculeRole.findMany(args),
      update: (id: string, translations: any) =>
        prisma.moleculeRole.update({ where: { id }, data: { translations } }),
    },
    description: {
      key: "description",
      label: "描述",
      field: "description",
      findMany: (args: any) => prisma.sectionDescription.findMany(args),
      update: (id: string, translations: any) =>
        prisma.sectionDescription.update({ where: { id }, data: { translations } }),
    },
  };
  return Object.values(models) as EntityConfig[];
}

function alreadyTranslated(row: any, field: string): boolean {
  const en = (row.translations as any)?.en?.[field];
  return typeof en === "string" && en.trim().length > 0;
}

async function translateBatch(
  client: OpenAI,
  entity: EntityConfig,
  rows: any[],
): Promise<Map<string, string>> {
  const source = rows.map((r) => ({ id: r.id, text: r[entity.field] }));
  const prompt = `你是化学专业的中英翻译。请把下面 JSON 中的每个化学文本翻译成准确、自然的英文化学术语/描述。
要求：
- 保留 SMARTS、SMILES、化学式、人名反应中的专有名词拼写，不要翻译成中文拼音。
- reaction name、tag、pattern name、molecule name 要简短。
- description 保持段落/句式通顺，不要编造化学事实。
- 只输出一个 JSON 对象：{"<id>": "<english text>"}，不要输出多余内容。
- 不要使用 Markdown。
输入：
${JSON.stringify(source)}
`;

  const result = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    // deepseek-v4-flash 默认开思维链，显式关闭，避免 token 被 reasoning 耗尽
    thinking: { type: "disabled" },
  } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming & {
    thinking: { type: "disabled" | "enabled" };
  });

  const content = result.choices[0]?.message?.content || "{}";
  let parsed: Record<string, string> = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    console.error("[translate] LLM 返回无法解析，重试该批。原始内容：", content.slice(0, 500));
    throw new Error("invalid JSON from LLM");
  }

  const map = new Map<string, string>();
  for (const row of rows) {
    const translated = parsed[row.id]?.trim();
    if (translated) map.set(row.id, translated);
  }
  return map;
}

async function processEntity(client: OpenAI, entity: EntityConfig) {
  console.log(`\n===== 开始翻译：${entity.label} =====`);
  const findArgs: any = { orderBy: { id: "asc" } };
  if (Number.isFinite(limit)) findArgs.take = limit;
  const all = await entity.findMany(findArgs);
  // 数据库现有数据 translations 大多为 null，也可能已部分翻译但缺 en 字段；
  // 这里全部拉回后在内存中统一过滤需要翻译的行。
  const pending = all.filter((r: any) => !alreadyTranslated(r, entity.field));
  if (Number.isFinite(limit)) pending.length = Math.min(pending.length, limit);
  console.log(`待翻译 ${pending.length} 条`);

  let done = 0;
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);
    if (batch.length === 0) continue;
    if (dryRun) {
      console.log(`[dry-run] ${entity.key} 批次 ${done + 1} 不调用 API`);
      done += batch.length;
      continue;
    }

    const translated = await translateBatch(client, entity, batch);
    for (const row of batch) {
      const enText = translated.get(row.id);
      if (!enText) continue;
      const currentTranslations = (row.translations as any) || {};
      const nextTranslations = {
        ...currentTranslations,
        en: {
          ...(currentTranslations?.en || {}),
          [entity.field]: enText,
        },
      };
      await entity.update(row.id, nextTranslations);
    }
    done += batch.length;
    console.log(`已处理 ${done}/${pending.length}`);
  }
}

async function main() {
  const client = getClient();
  const configs = entityConfigs().filter((c) => entity === "all" || c.key === entity);
  if (configs.length === 0) {
    console.error(`未知 entity: ${entity}`);
    process.exit(1);
  }
  console.log(`模型: ${MODEL}`);
  if (dryRun) console.log("dry-run 模式：不会调用 API / 不会写库");
  for (const config of configs) {
    try {
      await processEntity(client, config);
    } catch (err) {
      console.error(`翻译 ${config.label} 失败:`, err);
    }
  }
  await prisma.$disconnect();
}

main();
