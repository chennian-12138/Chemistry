#!/usr/bin/env tsx
/**
 * 通道二：分析归类整理（organize-reactions）
 *
 * 读取通道一（extract-raw）保存的原始 JSON 底稿，由第二个 AI 完成：
 *   1. 归类：识别同一反应在不同段落中的重复描述
 *   2. 合并：同底物多试剂变体合并（SMARTS 用 OR 写法），描述合并取原文
 *   3. 校对：修正 mechanismType/form/tags，补全 SMARTS 与分子描述名
 *   4. 输出整理后的 JSON，可选直接入库
 *
 * 用法:
 *   npx tsx scripts/organize-reactions.ts              # 整理全部已收集章节
 *   npx tsx scripts/organize-reactions.ts 6 7 8       # 只整理指定章节
 *   npx tsx scripts/organize-reactions.ts --no-db     # 只整理不入库
 *
 * 输入: data/raw/chNN.json
 * 输出: data/organized/chNN.json + 入库
 */
import "../lib/env";
import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import { fileURLToPath } from "node:url";
import { prisma } from "../lib/prisma";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RAW_DIR = path.join(__dirname, "..", "data", "raw");
const ORG_DIR = path.join(__dirname, "..", "data", "organized");

const COLLECTOR_ID = "dAJFSHdQfgomyBKa7vY6O28Z9QT8WrS5"; // 陈祺睿

function getClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.LLM_API_KEY,
    baseURL: process.env.LLM_BASE_URL || "https://api.deepseek.com",
  });
}
const MODEL = process.env.LLM_MODEL || "deepseek-v4-flash";

const CHAPTER_TITLES: Record<number, string> = {
  4: "烷烃自由基取代反应", 6: "卤代烃饱和碳原子上的亲核取代反应 β-消除反应",
  7: "醇和醚", 8: "烯烃 炔烃 加成反应（一）", 9: "共轭烯烃周环反应",
  10: "醛和酮加成反应（二）", 11: "羧酸", 12: "羧酸衍生物酰基碳上的亲核取代反应",
  13: "缩合反应", 14: "脂肪胺", 15: "苯、芳烃、芳香性", 16: "芳环上的取代反应",
  17: "烷基苯衍生物 酚醌", 18: "含氮芳香化合物 芳炔", 19: "杂环化合物", 20: "糖类化合物",
  21: "氨基酸、多肽、蛋白质以及核酸", 22: "脂类、萜类和甾族化合物", 23: "氧化反应",
  24: "重排反应", 25: "过渡金属催化的有机反应",
};

const MECHANISM_TYPES = ["其他", "自由基反应", "电性反应——亲电反应", "电性反应——亲核反应", "电环化反应"];
const REACTION_FORMS = ["其他", "加成反应", "消除反应", "取代反应", "重排反应", "加成后消除", "氧化反应", "还原反应", "周环反应"];
const SECTION_TYPES = ["通式与概述", "机理", "活性", "化学选择性", "区域选择性", "立体选择性", "实例", "应用", "其它"];
const CONDITION_OPTIONS = {
  temperature: ["-", "高温", "加热", "室温", "低温"],
  pressure: ["-", "高压", "低压"],
  duration: ["-", "短时间反应", "长时间反应"],
  concentration: ["-", "高浓度", "低浓度", "痕量"],
  solvent: ["-", "无", "非极性溶剂", "极性质子溶剂", "极性非质子溶剂"],
  microwave: ["-", "微波"],
  acidityBasicity: ["-", "强酸", "酸", "弱酸", "中性", "弱碱性", "碱性", "强碱性", "Lewis酸", "Lewis碱"],
  hydro: ["-", "水", "无水"],
};
const ROLES = ["反应物", "反应试剂", "产物"];

function extractJsonArray(text: string): unknown[] | null {
  let cleaned = text.trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) cleaned = fence[1]!.trim();
  const start = cleaned.indexOf("[");
  if (start === -1) return null;
  const end = cleaned.lastIndexOf("]");
  if (end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function sanitizeEnum(value: unknown, allowed: string[], fallback = "其他"): string {
  return typeof value === "string" && allowed.includes(value) ? value : fallback;
}

function sanitizeCondition(value: unknown, field: string): string {
  const allowed = CONDITION_OPTIONS[field as keyof typeof CONDITION_OPTIONS] ?? ["-"];
  return sanitizeEnum(value, allowed, "-");
}

function sanitizeReaction(raw: Record<string, any>): Record<string, any> {
  const meta = raw.meta ?? {};
  const smartsPatterns = Array.isArray(raw.smartsPatterns) ? raw.smartsPatterns : [];
  const reactionSections = Array.isArray(raw.reactionSections) ? raw.reactionSections : [];

  const cleanMeta = {
    name: typeof meta.name === "string" && meta.name.trim() ? meta.name.trim() : "未命名反应",
    mechanismType: sanitizeEnum(meta.mechanismType, MECHANISM_TYPES),
    form: sanitizeEnum(meta.form, REACTION_FORMS),
    tags: typeof meta.tags === "string" ? meta.tags.trim() : "",
  };

  const cleanPatterns = smartsPatterns.map((p: Record<string, any>) => {
    const mols = (list: unknown) =>
      Array.isArray(list)
        ? list
            .map((m: any) => ({
              smarts: typeof m?.smarts === "string" ? m.smarts.trim() : "",
              name: typeof m?.name === "string" ? m.name.trim() : "",
              role: sanitizeEnum(m?.role, ROLES),
            }))
            .filter((m) => m.name || m.smarts)
        : [];
    return {
      name: typeof p.name === "string" ? p.name.trim() : "",
      patternReactants: mols(p.patternReactants),
      patternRegents: mols(p.patternRegents),
      patternProducts: mols(p.patternProducts),
    };
  }).filter((p) => p.name || p.patternReactants.length > 0 || p.patternProducts.length > 0);

  const cleanSections = reactionSections.map((s: Record<string, any>) => ({
    sectionType: sanitizeEnum(s.sectionType, SECTION_TYPES, "通式与概述"),
    temperature: sanitizeCondition(s.temperature, "temperature"),
    pressure: sanitizeCondition(s.pressure, "pressure"),
    duration: sanitizeCondition(s.duration, "duration"),
    concentration: sanitizeCondition(s.concentration, "concentration"),
    solvent: sanitizeCondition(s.solvent, "solvent"),
    microwave: sanitizeCondition(s.microwave, "microwave"),
    acidityBasicity: sanitizeCondition(s.acidityBasicity, "acidityBasicity"),
    hydro: sanitizeCondition(s.hydro, "hydro"),
    reactions: [],
    descriptions: Array.isArray(s.descriptions)
      ? s.descriptions
          .map((d: any) => ({
            description: typeof d?.description === "string" ? d.description.trim() : "",
            refPageNo: typeof d?.refPageNo === "string" ? d.refPageNo : "",
          }))
          .filter((d) => d.description)
      : [],
  })).filter((s) => s.descriptions.length > 0);

  return { meta: cleanMeta, smartsPatterns: cleanPatterns, reactionSections: cleanSections };
}

const ORGANIZE_PROMPT = `你是精通有机化学的数据整理专家。你的任务是对「同一章教材中收集到的所有反应条目」进行分析、归类、去重和校对。

背景：这些条目来自逐段提取，同一反应可能在不同段落被重复提取，同一机理下的不同底物/试剂变体被拆成多条。你需要按「反应机理」归类合并，整理成规范、完整、无重复的反应列表。

【第一原则：按反应机理合并（强制）】
合并判断标准：反应机理相同（mechanismType 相同）且反应类型相同（form 相同）且底物属于同一官能团类别（如都是烷烃、都是烯烃）。满足以上三者即合并为一条。
- 同一机理下的不同试剂变体（如烷烃的氯化/溴化/碘化/氟化，均为自由基取代）→ 合并为一条，用最规范的类型名称（如"烷烃的卤化反应"），SMARTS 中试剂用方括号 OR 写法（[F,Cl,Br,I:2]），产物对应 [F,Cl,Br,I:3]
- 同一机理下的不同底物实例（如"甲烷的氯化""丙烷的氯化"）→ 合并，代表实例保留在名称中或作为 descriptions 的实例说明，不单独成条。若存在一个最经典/最完整的实例（如"甲烷的氯化"），可以它为代表，其余实例并入 descriptions
- 不同机理的反应不得合并（如 SN1 与 SN2，亲电加成与自由基加成）

【例外：人名反应必须独立，不得合并】
以人名命名的反应（Named Reaction，如 Diels-Alder反应、Michael加成、Wittig反应、Claisen缩合、Friedel-Crafts反应、Robinson环合、Grignard反应、SN2反应等）即使与某反应机理相同、底物类别相同，也必须作为独立词条保留，不得与类型反应合并，也不得相互合并。例如"Robinson环合"与"Michael加成"尽管机理上都是碳负离子反应，但必须分别独立成条。

【示例】输入包含"烷烃的卤化反应""甲烷氯化反应""烷烃的氯化反应""烷烃的溴化反应""卤化反应"等多条，它们均为自由基取代机理、底物同为烷烃 → 合并为一条"烷烃的卤化反应"（或"甲烷的氯化反应"作为代表），其 smartsPatterns 用 [F,Cl,Br,I:2] 覆盖全部卤素，descriptions 汇总所有原文描述。

【其他规则】
1. 合并时：名称保留最完整规范的名称；descriptions 取并集并保留教材原文摘录（可含多条，覆盖定义/条件/机理/实例）；smartsPatterns 并集合并，同机理试剂变体用 OR 写法，原子映射保持一致；tags 合并去重。
2. SMARTS：每个 pattern 中分子 name（中文描述名）必须有值；smarts 能推断就写通式（可泛化），实在无法确定才留空。尽量完整（反应物+试剂+产物三侧）。原子映射编号（:1 :2）保证反应物与产物的对应原子一致。
3. 校对：mechanismType 从 ${MECHANISM_TYPES.join("、")} 选择；form 从 ${REACTION_FORMS.join("、")} 选择（无法判断用"其他"）；tags 用中文逗号分隔（1~4个）。
4. reactionSections：sectionType 从 ${SECTION_TYPES.join("、")} 选择；条件字段只能从给定选项选，原文未提及时用"-"（temperature=${CONDITION_OPTIONS.temperature.join("/")}，pressure=${CONDITION_OPTIONS.pressure.join("/")}，duration=${CONDITION_OPTIONS.duration.join("/")}，concentration=${CONDITION_OPTIONS.concentration.join("/")}，solvent=${CONDITION_OPTIONS.solvent.join("/")}，microwave=${CONDITION_OPTIONS.microwave.join("/")}，acidityBasicity=${CONDITION_OPTIONS.acidityBasicity.join("/")}，hydro=${CONDITION_OPTIONS.hydro.join("/")}）。descriptions 必须保留教材原文摘录（完整句子或段落，禁止概括成短句），reactions 数组为空。
5. 只输出整理后的 JSON 数组，不要任何解释。每个元素结构：
{"meta":{"name":"","mechanismType":"","form":"","tags":""},"smartsPatterns":[{"name":"","patternReactants":[{"smarts":"","name":"","role":"反应物"}],"patternRegents":[],"patternProducts":[]}],"reactionSections":[{"sectionType":"","temperature":"-","pressure":"-","duration":"-","concentration":"-","solvent":"-","microwave":"-","acidityBasicity":"-","hydro":"-","reactions":[],"descriptions":[{"description":"","refPageNo":""}]}]}`;

// 按机理/类型/反应词做规则预聚类：把「可能属于同一反应」的条目归入同组
// 人名反应各自独立成组（不得与他人合并）；非人名反应按机理+类型+反应词聚类
const CLUSTER_KEY_WORDS = [
  "卤化", "硝化", "磺化", "氯磺化", "热裂", "裂解", "水解", "脱水", "酯化", "皂化",
  "加成", "消除", "取代", "重排", "还原", "氧化", "聚合", "缩合", "开环", "环化",
  "脱羧", "脱氢", "加氢", "胺化", "烷基化", "酰化", "偶联", "异构",
];

function clusterKeyOf(item: Record<string, any>): string {
  const name = item.meta?.name ?? "";
  // 人名反应：以人名本身作为独立聚类键
  if (NAMED_REACTION_RE.test(name)) return `NAMED:${name}`;
  // 非人名反应：提取反应类型词
  const word = CLUSTER_KEY_WORDS.find((w) => name.includes(w)) ?? "other";
  return `${item.meta?.mechanismType ?? "其他"}|${item.meta?.form ?? "其他"}|${word}`;
}

// 将原始条目按 clusterKey 分组（保持组内原顺序）
function clusterItems(items: Record<string, any>[]): Array<{ key: string; items: Record<string, any>[] }> {
  const groups = new Map<string, Record<string, any>[]>();
  for (const item of items) {
    const key = clusterKeyOf(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return [...groups.entries()].map(([key, items]) => ({ key, items }));
}

async function organizeChapter(chapterNum: number, rawRecords: Array<{ paraIdx: number; paraText: string; reactions: Record<string, any>[] }>): Promise<Record<string, any>[]> {
  // 将所有原始反应条目扁平化（去重前保留全部）
  const allRaw: Record<string, any>[] = [];
  for (const rec of rawRecords) {
    allRaw.push(...rec.reactions);
  }
  const title = CHAPTER_TITLES[chapterNum] ?? "";
  console.log(`[整理] 第${chapterNum}章 ${title}: 原始条目 ${allRaw.length} 条`);

  // 规则预聚类：把可能同一反应的条目归组，组内由 LLM 判断合并
  const groups = clusterItems(allRaw);
  console.log(`  预聚类: ${groups.length} 组`);

  const organized: Record<string, any>[] = [];
  for (const group of groups) {
    // 组内条目过多时再拆（拆出的子批仍同组，靠最终 dedupeByName 兜底）
    const subBatches: Record<string, any>[][] = [];
    for (let i = 0; i < group.items.length; i += 12) {
      subBatches.push(group.items.slice(i, i + 12));
    }

    for (let bi = 0; bi < subBatches.length; bi++) {
      const batch = subBatches[bi]!;
      let lastErr = "";
      let done = false;
      for (let attempt = 1; attempt <= 3 && !done; attempt++) {
        try {
          const res = await getClient().chat.completions.create({
            model: MODEL,
            messages: [
              { role: "system", content: ORGANIZE_PROMPT },
              {
                role: "user",
                content: `以下是《基础有机化学》第${chapterNum}章"${title}"中收集到的反应条目（聚类组"${group.key}"，子批 ${bi + 1}/${subBatches.length}，共 ${batch.length} 条）。请按机理归类、合并去重并整理。\n\n${JSON.stringify(batch, null, 2)}`,
              },
            ],
            temperature: 0.2,
            max_tokens: 8000,
            thinking: { type: "disabled" },
          } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming & {
            thinking: { type: "disabled" | "enabled" };
          });

          const content = res.choices[0]?.message?.content ?? "";
          const parsed = extractJsonArray(content);
          if (!parsed) {
            lastErr = `JSON 解析失败，输出长度 ${content.length}`;
            await new Promise((r) => setTimeout(r, 2000 * attempt));
            continue;
          }
          organized.push(...parsed.map((r) => sanitizeReaction(r as Record<string, any>)));
          done = true;
        } catch (err: any) {
          lastErr = err?.message ?? String(err);
          await new Promise((r) => setTimeout(r, 2000 * attempt));
        }
      }
      if (!done) {
        console.warn(`    组"${group.key}"子批${bi + 1} 整理失败: ${lastErr}（保留原始条目）`);
        organized.push(...batch.map((r) => sanitizeReaction(r)));
      }
    }
  }

  // 二次去重：不同组/子批可能仍产生重复，按名称合并
  let final = dedupeByName(organized);

  // 人名反应保护：原始输入中的人名反应必须独立保留在结果中
  // （LLM 可能因机理相同而误合并，代码层兜底确保命名反应不被吞并）
  const protectedNames = extractNamedReactionNames(allRaw);
  for (const pName of protectedNames) {
    const exists = final.some(
      (r) => r.meta.name.includes(pName) || pName.includes(r.meta.name.replace(/反应$/, "")),
    );
    if (!exists) {
      const origin = allRaw.find(
        (r) => r.meta.name.includes(pName) || pName.includes(r.meta.name.replace(/反应$/, "")),
      );
      if (origin) final.push(origin);
    }
  }
  final = dedupeByName(final);

  console.log(`  第${chapterNum}章: 整理后 ${final.length} 条（人名反应保护: ${protectedNames.length} 个）`);
  return final;
}

// 常见人名反应标记：用于识别命名反应（Named Reaction）
// 拉丁字母开头（如 Diels-Alder、Wittig）或常见中译人名反应（如傅-克、武兹、格氏）
const NAMED_REACTION_RE =
  /(Diels-Alder|Michael|Wittig|Claisen|Friedel|Crafts|Grignard|Robinson|Mannich|Aldol|Cannizzaro|Knoevenagel|Stobbe|Perkin|Knoevenagel|Kekul|Wurtz|武兹|傅-克|格氏|坎尼扎罗|克脑文格|珀金|曼尼希|罗宾逊|狄尔斯|迈克尔|瑞佛马斯基|拜耳|霍夫曼|Hofmann|Beckmann|Cope|Fries|Baeyer|Benzilic|Cannizzaro|Arndt|Wolff|Favorskii|Pinacol|Wagner|Meerwein|Reimer|Tiemann|Sandmeyer|Hunsdiecker|Dakin|Skraup|Bischler|Vilsmeier|Knoevenagel|Ullmann|Suzuki|Heck|Sonogashira|Negishi|Kumada|Stille|Sharpless)/i;

function extractNamedReactionNames(items: Record<string, any>[]): string[] {
  const names = new Set<string>();
  for (const item of items) {
    const name = item.meta?.name ?? "";
    if (NAMED_REACTION_RE.test(name)) names.add(name);
  }
  return [...names];
}

function normName(name: string): string {
  return name.replace(/反应$/, "").replace(/\s+/g, "");
}

function dedupeByName(items: Record<string, any>[]): Record<string, any>[] {
  const map = new Map<string, Record<string, any>>();
  for (const item of items) {
    const key = normName(item.meta.name);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
      continue;
    }
    if (item.meta.name.length > existing.meta.name.length) {
      existing.meta.name = item.meta.name;
    }
    const tags = new Set(
      (existing.meta.tags + "," + item.meta.tags)
        .split(",")
        .map((t: string) => t.trim())
        .filter(Boolean),
    );
    existing.meta.tags = [...tags].join(",");
    for (const s of item.reactionSections) {
      const sameType = existing.reactionSections.find(
        (e: Record<string, any>) => e.sectionType === s.sectionType,
      );
      if (sameType) {
        sameType.descriptions.push(...s.descriptions);
      } else {
        existing.reactionSections.push(s);
      }
    }
    for (const p of item.smartsPatterns) {
      if (!existing.smartsPatterns.some((e: Record<string, any>) => e.name === p.name)) {
        existing.smartsPatterns.push(p);
      }
    }
  }
  return [...map.values()];
}

function condToDb(v: string): string | null {
  return v === "-" ? null : v;
}

async function saveToDb(chapterNum: number, reactions: Record<string, any>[]): Promise<number> {
  let saved = 0;
  for (const r of reactions) {
    const meta = r.meta;
    const tags = (meta.tags ? meta.tags.split(",") : [])
      .map((t: string) => t.trim())
      .filter((t: string) => t.length > 0);

    try {
      await prisma.reaction.create({
        data: {
          name: meta.name,
          mechanismType: meta.mechanismType,
          form: meta.form,
          tags: {
            connectOrCreate: tags.map((tag: string) => ({
              where: { name: tag },
              create: { name: tag },
            })),
          },
          status: "PENDING",
          authorId: COLLECTOR_ID,
          patterns: {
            create: r.smartsPatterns.map((p: Record<string, any>) => ({
              name: p.name,
              molecules: {
                create: [
                  ...p.patternReactants.map((m: Record<string, any>) => ({ ...m, role: "反应物" })),
                  ...p.patternRegents.map((m: Record<string, any>) => ({ ...m, role: "反应试剂" })),
                  ...p.patternProducts.map((m: Record<string, any>) => ({ ...m, role: "产物" })),
                ],
              },
            })),
          },
          sections: {
            create: r.reactionSections.map((s: Record<string, any>) => ({
              sectionType: s.sectionType,
              temperature: condToDb(s.temperature),
              pressure: condToDb(s.pressure),
              duration: condToDb(s.duration),
              concentration: condToDb(s.concentration),
              solvent: condToDb(s.solvent),
              microwave: condToDb(s.microwave),
              acidityBasicity: condToDb(s.acidityBasicity),
              hydro: condToDb(s.hydro),
              reactions: { create: s.reactions.map((r2: Record<string, any>) => ({ value: r2.value })) },
              descriptions: {
                create: s.descriptions.map((d: Record<string, any>) => ({
                  description: d.description,
                  refPageNo: d.refPageNo,
                })),
              },
            })),
          },
        },
      });
      saved++;
    } catch (err: any) {
      console.error(`    第${chapterNum}章 入库失败 [${meta.name}]: ${err?.message ?? err}`);
    }
  }
  return saved;
}

async function main() {
  const args = process.argv.slice(2);
  const noDb = args.includes("--no-db");
  const numArgs = args.filter((a) => !a.startsWith("--"));
  const requested = numArgs.length > 0 ? new Set(numArgs.map(Number)) : null;

  fs.mkdirSync(ORG_DIR, { recursive: true });

  const chapters = Object.keys(CHAPTER_TITLES).map(Number).sort((a, b) => a - b);
  const targets = requested ? chapters.filter((c) => requested.has(c)) : chapters;

  const available: number[] = [];
  for (const ch of targets) {
    const rawFile = path.join(RAW_DIR, `ch${ch}.json`);
    if (fs.existsSync(rawFile)) available.push(ch);
  }
  if (available.length === 0) {
    console.error("没有可整理的原始数据。请先运行 extract-raw.ts 收集。");
    process.exit(1);
  }

  console.log(`通道二(整理) 准备处理 ${available.length} 个章节: ${available.join(", ")}`);

  let totalOrganized = 0;
  let totalSaved = 0;
  for (const ch of available) {
    const rawFile = path.join(RAW_DIR, `ch${ch}.json`);
    const rawRecords = JSON.parse(fs.readFileSync(rawFile, "utf-8")) as Array<{
      paraIdx: number;
      paraText: string;
      reactions: Record<string, any>[];
    }>;

    const organized = await organizeChapter(ch, rawRecords);
    totalOrganized += organized.length;

    const orgFile = path.join(ORG_DIR, `ch${ch}.json`);
    fs.writeFileSync(orgFile, JSON.stringify(organized, null, 2), "utf-8");

    if (!noDb) {
      const saved = await saveToDb(ch, organized);
      totalSaved += saved;
      console.log(`  第${ch}章入库 ${saved}/${organized.length} 条`);
    }
  }

  console.log("\n========== 通道二完成 ==========");
  console.log(`整理章节: ${available.join(", ")}`);
  console.log(`整理后反应总数: ${totalOrganized}`);
  if (!noDb) {
    console.log(`已入库: ${totalSaved} 条 (author=陈祺睿, status=PENDING)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
