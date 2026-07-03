"use client";

import { useEffect, useRef, useState } from "react";

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
  const adRef = useRef<HTMLModElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const adClient = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT ?? defaultAdClient;
  const adSlot = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT ?? defaultAdSlot;

  useEffect(() => {
    const adElement = adRef.current;

    try {
      window.adsbygoogle = window.adsbygoogle ?? [];
      window.adsbygoogle.push({});
    } catch {
      // Ad blockers or local preview restrictions can prevent AdSense initialization.
    }

    if (!adElement) {
      return;
    }

    const updateVisibility = () => {
      setIsVisible(adElement.getAttribute("data-ad-status") === "filled");
    };

    updateVisibility();

    const observer = new MutationObserver(updateVisibility);
    observer.observe(adElement, {
      attributes: true,
      attributeFilter: ["data-ad-status"]
    });

    return () => observer.disconnect();
  }, []);

  return (
    <aside
      className={[
        isVisible
          ? "rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3"
          : "h-0 overflow-hidden border-0 p-0",
        className
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={labels[language].advertisement}
      aria-hidden={!isVisible}
    >
      <div className={isVisible ? "mb-2 text-center text-xs font-medium uppercase text-muted-foreground" : "hidden"}>
        {labels[language].advertisement}
      </div>
      <ins
        ref={adRef}
        className={isVisible ? "adsbygoogle block min-h-[90px] w-full" : "adsbygoogle block h-0 w-full"}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
