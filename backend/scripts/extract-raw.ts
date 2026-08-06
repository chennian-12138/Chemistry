#!/usr/bin/env tsx
/**
 * 通道一：原始收集（extract-raw）
 *
 * 逐段从教材 md 中提取反应，不做任何去重/合并，保存原始 JSON 底稿。
 * 每个段落的提取结果独立保存，作为可追溯的原始数据。
 *
 * 用法:
 *   npx tsx scripts/extract-raw.ts            # 收集全部章节(跳过 1,2,3,5,26)
 *   npx tsx scripts/extract-raw.ts 6 7 8     # 只收集指定章节
 *   npx tsx scripts/extract-raw.ts --dry-run # 只验证分段逻辑
 *
 * 输出: data/raw/chNN.json — [{paraIdx, paraText, reactions: [...]}, ...]
 */
import "../lib/env";
import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const MD_001 = path.join(PROJECT_ROOT, "organic_chemistry_001.md");
const MD_002 = path.join(PROJECT_ROOT, "organic_chemistry_002.md");
const RAW_DIR = path.join(__dirname, "..", "data", "raw");

const MIN_PARAGRAPH_CHARS = 40;

function getClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.LLM_API_KEY,
    baseURL: process.env.LLM_BASE_URL || "https://api.deepseek.com",
  });
}
const MODEL = process.env.LLM_MODEL || "deepseek-v4-flash";

interface Chapter {
  num: number;
  file: number;
  start: number;
  end: number;
  skip: boolean;
  title: string;
}

const CHAPTERS: Chapter[] = [
  { num: 1, file: 0, start: 1, end: 309, skip: true, title: "绪论" },
  { num: 2, file: 0, start: 310, end: 982, skip: true, title: "有机化合物的分类 表示方式 命名" },
  { num: 3, file: 0, start: 983, end: 1612, skip: true, title: "立体化学" },
  { num: 4, file: 0, start: 1613, end: 1996, skip: false, title: "烷烃自由基取代反应" },
  { num: 5, file: 0, start: 1997, end: 3115, skip: true, title: "紫外光谱 红外光谱 核磁共振和质谱" },
  { num: 6, file: 0, start: 3116, end: 4214, skip: false, title: "卤代烃饱和碳原子上的亲核取代反应 β-消除反应" },
  { num: 7, file: 0, start: 4215, end: 5088, skip: false, title: "醇和醚" },
  { num: 8, file: 0, start: 5089, end: 6089, skip: false, title: "烯烃 炔烃 加成反应（一）" },
  { num: 9, file: 0, start: 6090, end: 6937, skip: false, title: "共轭烯烃周环反应" },
  { num: 10, file: 0, start: 6938, end: 8008, skip: false, title: "醛和酮加成反应（二）" },
  { num: 11, file: 0, start: 8009, end: 8553, skip: false, title: "羧酸" },
  { num: 12, file: 0, start: 8554, end: 9408, skip: false, title: "羧酸衍生物酰基碳上的亲核取代反应" },
  { num: 13, file: 0, start: 9409, end: 10075, skip: false, title: "缩合反应" },
  { num: 14, file: 1, start: 1, end: 803, skip: false, title: "脂肪胺" },
  { num: 15, file: 1, start: 804, end: 1720, skip: false, title: "苯、芳烃、芳香性" },
  { num: 16, file: 1, start: 1721, end: 2528, skip: false, title: "芳环上的取代反应" },
  { num: 17, file: 1, start: 2529, end: 3268, skip: false, title: "烷基苯衍生物 酚醌" },
  { num: 18, file: 1, start: 3269, end: 3967, skip: false, title: "含氮芳香化合物 芳炔" },
  { num: 19, file: 1, start: 3968, end: 4815, skip: false, title: "杂环化合物" },
  { num: 20, file: 1, start: 4816, end: 5450, skip: false, title: "糖类化合物" },
  { num: 21, file: 1, start: 5451, end: 6312, skip: false, title: "氨基酸、多肽、蛋白质以及核酸" },
  { num: 22, file: 1, start: 6313, end: 6939, skip: false, title: "脂类、萜类和甾族化合物" },
  { num: 23, file: 1, start: 6940, end: 7672, skip: false, title: "氧化反应" },
  { num: 24, file: 1, start: 7673, end: 8445, skip: false, title: "重排反应" },
  { num: 25, file: 1, start: 8446, end: 9233, skip: false, title: "过渡金属催化的有机反应" },
  { num: 26, file: 1, start: 9234, end: 9936, skip: true, title: "有机合成与逆合成分析" },
];

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

function sliceChapter(ch: Chapter): string {
  const mdPath = ch.file === 0 ? MD_001 : MD_002;
  const lines = fs.readFileSync(mdPath, "utf-8").split("\n");
  return lines.slice(ch.start - 1, ch.end).join("\n");
}

function splitParagraphs(text: string): Array<{ text: string; idx: number }> {
  const blocks = text.split(/\n\s*\n/);
  const result: Array<{ text: string; idx: number }> = [];
  for (let i = 0; i < blocks.length; i++) {
    const p = blocks[i]!.trim();
    if (p.length < MIN_PARAGRAPH_CHARS) continue;
    if (/^#{1,6}\s/.test(p)) continue;
    if (/^图\s*\d/.test(p)) continue;
    if (/^表\s*\d/.test(p)) continue;
    if (p.includes("习题")) continue;
    result.push({ text: p, idx: i });
  }
  return result;
}

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
  });

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
  }));

  return { meta: cleanMeta, smartsPatterns: cleanPatterns, reactionSections: cleanSections };
}

const SYSTEM_PROMPT = `你是精通有机化学的专家，负责从《基础有机化学》（邢其毅，北京大学出版社）的教材文本中提取有机化学反应，整理为结构化数据。

规则：
1. 从给定的教材文本片段中识别所有「具体的、有明确名称或明确反应物/产物关系的反应」。
2. 提取粒度：重要的命名反应/类型反应独立成条；同类型的简单实例合并进同一条的 descriptions 中。如果文本片段不包含任何反应，输出空数组 []。
3. 只提取文本中确实描述的反应，不要凭空编造。
4. 反应名称使用教材中的命名（中文），如"卤化反应""热裂""醛的还原"。
5. mechanismType 从以下枚举选择：${MECHANISM_TYPES.join("、")}。
6. form 从以下枚举选择：${REACTION_FORMS.join("、")}。无法判断时用"其他"。
7. tags 用中文逗号分隔的关键词（1~4个），如"卤化反应,自由基取代"。
8. smartsPatterns：根据反应的官能团变化写出通式 SMARTS。同一底物参与的不同试剂变体（如烯烃与 HCl/HBr/HI 加成）必须合并为同一个 pattern，试剂用方括号 OR 写法（如 [F,Cl,Br,I:2]）。反应物/试剂/产物分别放入 patternReactants / patternRegents / patternProducts，每个分子包含 smarts（通式 SMARTS）、name（中文描述名）、role（反应物/反应试剂/产物）。原子映射编号（:1 :2 等）保证反应物与产物的对应原子一致。每个分子的 name 必须有值；smarts 实在无法确定时才可留空，但 name 必须给出。
8a. 角色归类约定：有机底物（如烷烃、烯烃、醇）放入 patternReactants；无机小分子试剂、催化剂、酸碱、氧化剂/还原剂等辅助物种（如 Cl2、Br2、H2、H2O、NaOH、HNO3、H2SO4、KMnO4、O2）放入 patternRegents；主要有机产物放入 patternProducts。
9. reactionSections：将教材中该反应的描述文字整理为小节。sectionType 从以下枚举选择：${SECTION_TYPES.join("、")}。每个小节包含条件字段（temperature/pressure/duration/concentration/solvent/microwave/acidityBasicity/hydro，只能从给定选项选，教材未提及时用"-"）和 descriptions。descriptions 必须从教材原文中摘录完整句子或段落（可做轻微 OCR 清理，如去掉 LaTeX 残留），禁止概括总结成短句；一个反应可有多条 description，覆盖定义、条件、机理、实例等不同方面。reactions 数组保持空数组（反应式由人工后续绘制）。
10. 条件字段合法值：temperature=${CONDITION_OPTIONS.temperature.join("/")}；pressure=${CONDITION_OPTIONS.pressure.join("/")}；duration=${CONDITION_OPTIONS.duration.join("/")}；concentration=${CONDITION_OPTIONS.concentration.join("/")}；solvent=${CONDITION_OPTIONS.solvent.join("/")}；microwave=${CONDITION_OPTIONS.microwave.join("/")}；acidityBasicity=${CONDITION_OPTIONS.acidityBasicity.join("/")}；hydro=${CONDITION_OPTIONS.hydro.join("/")}。
11. 只输出一个 JSON 数组，不要输出任何其他文字、解释或 markdown 标记。每个元素结构为：
{"meta":{"name":"","mechanismType":"","form":"","tags":""},"smartsPatterns":[{"name":"","patternReactants":[{"smarts":"","name":"","role":"反应物"}],"patternRegents":[],"patternProducts":[]}],"reactionSections":[{"sectionType":"","temperature":"-","pressure":"-","duration":"-","concentration":"-","solvent":"-","microwave":"-","acidityBasicity":"-","hydro":"-","reactions":[],"descriptions":[{"description":"","refPageNo":""}]}]}`;

async function extractParagraph(
  ch: Chapter,
  para: { text: string; idx: number },
): Promise<Record<string, any>[]> {
  let lastErr = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await getClient().chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `以下是《基础有机化学》第${ch.num}章"${ch.title}"的教材文本片段。请提取其中描述的所有有机化学反应；若不含反应请输出 []。\n\n${para.text}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 4000,
        thinking: { type: "disabled" },
      } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming & {
        thinking: { type: "disabled" | "enabled" };
      });

      const content = res.choices[0]?.message?.content ?? "";
      const parsed = extractJsonArray(content);
      if (!parsed) {
        lastErr = `JSON 解析失败，输出长度 ${content.length}`;
        continue;
      }
      return parsed.map((r) => sanitizeReaction(r as Record<string, any>));
    } catch (err: any) {
      lastErr = err?.message ?? String(err);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  console.warn(`    段落#${para.idx} 提取失败: ${lastErr}（丢弃）`);
  return [];
}

async function collectChapter(ch: Chapter): Promise<void> {
  const chapterText = sliceChapter(ch);
  const paras = splitParagraphs(chapterText);
  console.log(`[收集] 第${ch.num}章 ${ch.title}: ${chapterText.length}字符 -> ${paras.length}段`);

  const records: Array<{ paraIdx: number; paraText: string; reactions: Record<string, any>[] }> = [];
  for (let i = 0; i < paras.length; i++) {
    const para = paras[i]!;
    const reactions = await extractParagraph(ch, para);
    if (reactions.length > 0) {
      records.push({ paraIdx: para.idx, paraText: para.text, reactions });
    }
    if ((i + 1) % 25 === 0 || i === paras.length - 1) {
      console.log(`    已处理 ${i + 1}/${paras.length} 段，累计 ${records.reduce((a, r) => a + r.reactions.length, 0)} 条原始记录`);
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  const outFile = path.join(RAW_DIR, `ch${ch.num}.json`);
  fs.writeFileSync(outFile, JSON.stringify(records, null, 2), "utf-8");
  const total = records.reduce((a, r) => a + r.reactions.length, 0);
  console.log(`  第${ch.num}章: ${records.length} 段含反应，共 ${total} 条原始记录 -> ${outFile}`);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const numArgs = args.filter((a) => !a.startsWith("--"));
  const requested = numArgs.length > 0 ? new Set(numArgs.map(Number)) : null;

  fs.mkdirSync(RAW_DIR, { recursive: true });

  const chapters = CHAPTERS.filter((c) => !c.skip);
  const targets = requested ? chapters.filter((c) => requested.has(c.num)) : chapters;

  if (targets.length === 0) {
    console.error("没有需要收集的章节。请检查章节号参数。");
    process.exit(1);
  }

  console.log(`通道一(原始收集) 准备处理 ${targets.length} 个章节: ${targets.map((c) => c.num).join(", ")}`);

  if (dryRun) {
    console.log("[dry-run] 验证段落切分逻辑（不调用 LLM）...");
    for (const ch of targets) {
      const paras = splitParagraphs(sliceChapter(ch));
      console.log(`  第${ch.num}章 ${ch.title}: ${paras.length}段`);
    }
    return;
  }

  for (const ch of targets) {
    await collectChapter(ch);
  }

  console.log("\n========== 通道一完成 ==========");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
