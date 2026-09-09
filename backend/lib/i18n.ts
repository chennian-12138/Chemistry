// 轻量级国际化辅助：语言参数识别 + 有限枚举的中英映射 + DB 字段本地化取值。
// 数据库中的 reaction.name/tag.name/description 等会通过 translations JSON 存储英文；
// 如果没有英文翻译则回退到中文原始字段。

export type Locale = "zh" | "en";

const ZH_EN: Record<string, string> = {
  // 角色
  反应物: "Reactant",
  反应试剂: "Reagent",
  产物: "Product",

  // mechanismType
  其他: "Other",
  自由基反应: "Radical Reaction",
  "电性反应——亲电反应": "Polar Reaction — Electrophilic",
  "电性反应——亲核反应": "Polar Reaction — Nucleophilic",
  电环化反应: "Electrocyclic Reaction",

  // form
  加成反应: "Addition Reaction",
  消除反应: "Elimination Reaction",
  取代反应: "Substitution Reaction",
  重排反应: "Rearrangement Reaction",
  加成后消除: "Addition-Elimination",
  氧化反应: "Oxidation Reaction",
  还原反应: "Reduction Reaction",
  周环反应: "Pericyclic Reaction",

  // sectionType
  通式与概述: "General Scheme & Overview",
  机理: "Mechanism",
  活性: "Reactivity",
  化学选择性: "Chemoselectivity",
  区域选择性: "Regioselectivity",
  立体选择性: "Stereoselectivity",
  实例: "Examples",
  应用: "Applications",
  其它: "Others",

  // 常见条件/试剂文字
  高温: "High Temperature",
  加热: "Heating",
  室温: "Room Temperature",
  低温: "Low Temperature",
  高压: "High Pressure",
  低压: "Low Pressure",
  短时间反应: "Short Reaction Time",
  长时间反应: "Long Reaction Time",
  高浓度: "High Concentration",
  低浓度: "Low Concentration",
  痕量: "Trace",
  无: "None",
  非极性溶剂: "Nonpolar Solvent",
  极性质子溶剂: "Polar Protic Solvent",
  极性非质子溶剂: "Polar Aprotic Solvent",
  微波: "Microwave",
  强酸: "Strong Acid",
  酸: "Acid",
  弱酸: "Weak Acid",
  中性: "Neutral",
  弱碱性: "Weak Base",
  碱性: "Base",
  强碱性: "Strong Base",
  Lewis酸: "Lewis Acid",
  Lewis碱: "Lewis Base",
  水: "Water",
  无水: "Anhydrous",
};

export function getLocale(value: unknown): Locale {
  return value === "en" ? "en" : "zh";
}

export function localizeEnum(value: string | null | undefined, locale: Locale): string | null | undefined {
  if (value === null || value === undefined) return value;
  if (locale === "zh") return value;
  return ZH_EN[value] ?? value;
}

export function localizeField(
  record: { translations?: unknown } | null | undefined,
  field: string,
  locale: Locale,
  fallback?: string,
): string {
  if (locale === "zh") {
    const zhValue = (record as any)?.[field];
    return zhValue || fallback || "";
  }
  const translations = (record?.translations ?? null) as Record<string, any> | null;
  const translated = translations?.[locale]?.[field];
  if (typeof translated === "string" && translated.trim()) return translated;
  const raw = (record as any)?.[field];
  return raw || fallback || "";
}

export function localizeJsonField(
  translations: Record<string, any> | null | undefined,
  field: string,
  locale: Locale,
  fallback: string,
): string {
  if (locale === "zh") return fallback;
  const translated = translations?.[locale]?.[field];
  return typeof translated === "string" && translated.trim() ? translated : fallback;
}
