"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookmarkX } from "lucide-react";

import {
  getFavoriteProgramIds,
  removeFavoriteProgramId
} from "@/components/FavoriteButton";
import { useLanguage } from "@/components/LanguageProvider";
import ProgramCard from "@/components/ProgramCard";
import { Button } from "@/components/ui/button";
import { useCurrentDate } from "@/components/useCurrentDate";
import { programs } from "@/lib/programs";

export default function MyListPage() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const { t } = useLanguage();
  const now = useCurrentDate();

  useEffect(() => {
    const syncFavorites = () => {
      setFavoriteIds(getFavoriteProgramIds());
    };

    syncFavorites();
    window.addEventListener("storage", syncFavorites);
    window.addEventListener("admitflow:favorites-changed", syncFavorites);

    return () => {
      window.removeEventListener("storage", syncFavorites);
      window.removeEventListener("admitflow:favorites-changed", syncFavorites);
    };
  }, []);

  const savedPrograms = useMemo(
    () => programs.filter((program) => favoriteIds.includes(program.id)),
    [favoriteIds]
  );

  const clearMissingIds = () => {
    favoriteIds
      .filter((id) => !programs.some((program) => program.id === id))
      .forEach(removeFavoriteProgramId);
  };

  useEffect(() => {
    clearMissingIds();
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" className="mb-6 -ml-3">
        <Link href="/">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t.backToPrograms}
        </Link>
      </Button>

      <section className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-normal">{t.myList}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t.myListDescription}
          </p>
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          {t.savedCount(savedPrograms.length)}
        </p>
      </section>

      {savedPrograms.length > 0 ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {savedPrograms.map((program) => (
            <ProgramCard key={program.id} program={program} now={now} />
          ))}
        </section>
      ) : (
        <section className="rounded-lg border border-dashed border-border bg-card p-10 text-center shadow-soft">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-muted">
            <BookmarkX className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold">{t.noSavedPrograms}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {t.noSavedProgramsDescription}
          </p>
          <Button asChild className="mt-6">
            <Link href="/">{t.browsePrograms}</Link>
          </Button>
        </section>
      )}
    </main>
  );
}
