// 给非组件模块（如 API client）读取当前语言的纯工具函数。
const STORAGE_KEY = "language";

export type Language = "zh" | "en";

export function readCurrentLanguage(): Language {
  if (typeof window === "undefined") return "zh";
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "zh";
  } catch {
    return "zh";
  }
}

export function languageQuery(lang?: Language): string {
  const active = lang ?? readCurrentLanguage();
  return active === "en" ? "en" : "zh";
}
