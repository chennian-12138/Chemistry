"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/src/i18n/language-provider";

export default function LanguageSwitchButton() {
  const { locale, toggleLocale } = useI18n();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="gap-1.5"
      onClick={toggleLocale}
      title={locale === "zh" ? "Switch to English" : "切换到中文"}
    >
      <Languages className="h-4 w-4" />
      {locale === "zh" ? "EN" : "中文"}
    </Button>
  );
}
