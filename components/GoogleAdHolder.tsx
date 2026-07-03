"use client";

import { useEffect } from "react";

import { useLanguage } from "@/components/LanguageProvider";

type GoogleAdHolderProps = {
  className?: string;
};

const labels = {
  zh: {
    advertisement: "广告"
  },
  en: {
    advertisement: "Advertisement"
  }
} as const;

const defaultAdClient = "ca-pub-4558912554658127";
const defaultAdSlot = "7722244782";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, never>>;
  }
}

export default function GoogleAdHolder({ className }: GoogleAdHolderProps) {
  const { language } = useLanguage();
  const adClient = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT ?? defaultAdClient;
  const adSlot = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT ?? defaultAdSlot;

  useEffect(() => {
    try {
      window.adsbygoogle = window.adsbygoogle ?? [];
      window.adsbygoogle.push({});
    } catch {
      // Ad blockers or local preview restrictions can prevent AdSense initialization.
    }
  }, []);

  return (
    <aside
      className={[
        "rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3",
        className
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={labels[language].advertisement}
    >
      <div className="mb-2 text-center text-xs font-medium uppercase text-muted-foreground">
        {labels[language].advertisement}
      </div>
      <ins
        className="adsbygoogle block min-h-[90px] w-full"
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
