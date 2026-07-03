"use client";

import { Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import { languageLabels } from "@/lib/i18n";
import { useLanguage } from "@/components/LanguageProvider";

export default function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage();
  const nextLanguage = language === "zh" ? "en" : "zh";

  return (
    <Button
      aria-label={t.languageToggle}
      className={className}
      onClick={() => setLanguage(nextLanguage)}
      size="sm"
      type="button"
      variant="outline"
    >
      <Languages className="h-4 w-4" aria-hidden="true" />
      {languageLabels[nextLanguage]}
    </Button>
  );
}
