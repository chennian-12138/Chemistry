"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { dictionaries, type Language, type TranslationKey } from "./dictionaries";

const STORAGE_KEY = "language";

interface LanguageContextValue {
  locale: Language;
  setLocale: (locale: Language) => void;
  toggleLocale: () => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readInitialLocale(): Language {
  if (typeof window === "undefined") return "zh";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "en" ? "en" : "zh";
  } catch {
    return "zh";
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Language>("zh");

  useEffect(() => {
    setLocaleState(readInitialLocale());
  }, []);

  const setLocale = useCallback((next: Language) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
    document.documentElement.lang = next === "en" ? "en" : "zh-CN";
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((prev) => {
      const next: Language = prev === "zh" ? "en" : "zh";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
      document.documentElement.lang = next === "en" ? "en" : "zh-CN";
      return next;
    });
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    const t = (key: TranslationKey) => dictionaries[locale][key] ?? dictionaries.zh[key] ?? key;
    return { locale, setLocale, toggleLocale, t };
  }, [locale, setLocale, toggleLocale]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
}
