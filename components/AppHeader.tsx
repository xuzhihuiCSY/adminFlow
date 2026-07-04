"use client";

import Link from "next/link";
import { GraduationCap, ListChecks, Menu, Trophy, X } from "lucide-react";
import { useState } from "react";

import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";

export default function AppHeader() {
  const { t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toggleMenu = () => setIsMenuOpen((current) => !current);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2 text-base font-semibold" onClick={closeMenu}>
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </span>
          AdmitFlow
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="/"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            {t.navPrograms}
          </Link>
          <Link
            href="/my-list"
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            <ListChecks className="h-4 w-4" aria-hidden="true" />
            {t.navMyList}
          </Link>
          <Link
            href="/rankings"
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            <Trophy className="h-4 w-4" aria-hidden="true" />
            {t.navRankings}
          </Link>
          <LanguageToggle />
        </nav>
        <Button
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          className="md:hidden"
          onClick={toggleMenu}
          size="icon"
          type="button"
          variant="outline"
        >
          {isMenuOpen ? (
            <X className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Menu className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>
      {isMenuOpen ? (
        <nav className="border-t border-border bg-background px-4 py-3 shadow-soft md:hidden">
          <div className="mx-auto grid max-w-7xl gap-1">
            <MobileNavLink href="/" onClick={closeMenu}>
              {t.navPrograms}
            </MobileNavLink>
            <MobileNavLink href="/my-list" onClick={closeMenu}>
              <ListChecks className="h-4 w-4" aria-hidden="true" />
              {t.navMyList}
            </MobileNavLink>
            <MobileNavLink href="/rankings" onClick={closeMenu}>
              <Trophy className="h-4 w-4" aria-hidden="true" />
              {t.navRankings}
            </MobileNavLink>
            <div className="pt-2">
              <LanguageToggle className="w-full justify-center" />
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  );
}

function MobileNavLink({
  children,
  href,
  onClick
}: {
  children: React.ReactNode;
  href: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
