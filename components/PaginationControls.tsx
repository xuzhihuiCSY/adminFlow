"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const labels = {
  zh: {
    previous: "上一页",
    next: "下一页",
    pageStatus: (page: number, totalPages: number) => `第 ${page} / ${totalPages} 页`
  },
  en: {
    previous: "Previous",
    next: "Next",
    pageStatus: (page: number, totalPages: number) => `Page ${page} of ${totalPages}`
  }
} as const;

export default function PaginationControls({
  page,
  totalPages,
  onPageChange
}: PaginationControlsProps) {
  const { language } = useLanguage();
  const copy = labels[language];

  if (totalPages <= 1) {
    return null;
  }

  const pages = getVisiblePages(page, totalPages);

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Pagination">
      <p className="text-sm text-muted-foreground">{copy.pageStatus(page, totalPages)}</p>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{copy.previous}</span>
        </Button>
        {pages.map((pageNumber) => (
          <Button
            key={pageNumber}
            type="button"
            variant={pageNumber === page ? "default" : "ghost"}
            size="sm"
            className="w-9 px-0"
            aria-current={pageNumber === page ? "page" : undefined}
            onClick={() => onPageChange(pageNumber)}
          >
            {pageNumber}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          <span className="hidden sm:inline">{copy.next}</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}

function getVisiblePages(page: number, totalPages: number) {
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
