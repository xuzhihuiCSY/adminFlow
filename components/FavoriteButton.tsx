"use client";

import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FAVORITES_KEY = "admitflow:favorites";
const FAVORITES_EVENT = "admitflow:favorites-changed";

function readFavorites() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value = window.localStorage.getItem(FAVORITES_KEY);
    return value ? (JSON.parse(value) as string[]) : [];
  } catch {
    return [];
  }
}

function writeFavorites(ids: string[]) {
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(FAVORITES_EVENT, { detail: ids }));
}

export function getFavoriteProgramIds() {
  return readFavorites();
}

export function removeFavoriteProgramId(programId: string) {
  writeFavorites(readFavorites().filter((id) => id !== programId));
}

type FavoriteButtonProps = {
  programId: string;
  className?: string;
  compact?: boolean;
};

export default function FavoriteButton({
  programId,
  className,
  compact = false
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const syncState = () => {
      setIsFavorite(readFavorites().includes(programId));
    };

    syncState();
    window.addEventListener("storage", syncState);
    window.addEventListener(FAVORITES_EVENT, syncState);

    return () => {
      window.removeEventListener("storage", syncState);
      window.removeEventListener(FAVORITES_EVENT, syncState);
    };
  }, [programId]);

  const toggleFavorite = () => {
    const favorites = readFavorites();
    const nextFavorites = favorites.includes(programId)
      ? favorites.filter((id) => id !== programId)
      : [...favorites, programId];

    writeFavorites(nextFavorites);
    setIsFavorite(nextFavorites.includes(programId));
  };

  return (
    <Button
      aria-pressed={isFavorite}
      aria-label={isFavorite ? t.removeFromList : t.addToList}
      className={cn(className)}
      onClick={toggleFavorite}
      size={compact ? "icon" : "default"}
      type="button"
      variant={isFavorite ? "secondary" : "outline"}
    >
      {isFavorite ? (
        <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Bookmark className="h-4 w-4" aria-hidden="true" />
      )}
      {!compact ? (isFavorite ? t.saved : t.save) : null}
    </Button>
  );
}
