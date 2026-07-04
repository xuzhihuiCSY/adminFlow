import catalogMetaData from "@/data/catalog-meta.json";
import type { Language } from "@/lib/i18n";

type CatalogMeta = {
  lastVerified: string;
  sourceSummary: string;
  summary: {
    programsChecked: number;
    brokenLinks: number;
    protectedOrRateLimitedLinks: number;
    verifiedProtectedLinks: number;
    programsNeedingDeadlineReview: number;
  };
};

export const catalogMeta = catalogMetaData as CatalogMeta;

export function formatLastVerified(language: Language) {
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(catalogMeta.lastVerified));
}

