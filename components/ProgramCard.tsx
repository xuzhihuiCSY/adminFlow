"use client";

import Link from "next/link";
import { CalendarDays, Clock, MapPin } from "lucide-react";

import FavoriteButton from "@/components/FavoriteButton";
import { useLanguage } from "@/components/LanguageProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatLastVerified } from "@/lib/catalog-meta";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  formatProgramDate,
  getAvailabilityLabel,
  getGreLabel,
  getLevelLabel,
  getStateLabel
} from "@/lib/i18n";
import {
  getAvailabilityTone,
  getDaysUntilDeadline,
  getGreTone,
  getNextApplicationOpenDate,
  getProgramStatus,
  getRelevantApplicationWindow,
  type Program
} from "@/lib/programs";

type ProgramCardProps = {
  program: Program;
  now: Date;
};

const qualityCopy = {
  zh: {
    verified: "最后核验",
    source: "官方来源优先",
    report: "报告问题"
  },
  en: {
    verified: "Last verified",
    source: "Official sources first",
    report: "Report issue"
  }
} as const;

function formatDeadlineCountdown(
  deadline: string,
  t: ReturnType<typeof useLanguage>["t"],
  now: Date
) {
  const days = getDaysUntilDeadline(deadline, now);

  if (days < 0) {
    return t.deadlinePassed;
  }

  if (days === 0) {
    return t.dueToday;
  }

  if (days === 1) {
    return t.oneDayLeft;
  }

  return t.daysLeft(days);
}

export default function ProgramCard({ program, now }: ProgramCardProps) {
  const { language, t } = useLanguage();
  const copy = qualityCopy[language];
  const status = getProgramStatus(program, now);
  const isOpen = status === "Open";
  const nextOpenDate = getNextApplicationOpenDate(program, now);
  const relevantWindow = getRelevantApplicationWindow(program, now);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-2 truncate text-sm font-medium text-muted-foreground">
              {program.school}
            </p>
            <CardTitle className="leading-tight">{program.program}</CardTitle>
          </div>
          <FavoriteButton programId={program.id} compact />
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="muted">{getLevelLabel(program.level, language)}</Badge>
          <Badge variant="muted">{program.degree}</Badge>
          <Badge variant={getAvailabilityTone(status)}>
            {getAvailabilityLabel(status, language)}
          </Badge>
          <Badge variant={getGreTone(program.gre)}>{getGreLabel(program.gre, language)}</Badge>
        </div>
        <div className="grid gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-foreground/70" aria-hidden="true" />
            {getStateLabel(program.state, language)}
          </div>
          <div className="flex items-center gap-2">
            {isOpen ? (
              <>
                <CalendarDays className="h-4 w-4 text-foreground/70" aria-hidden="true" />
                <span>
                  {relevantWindow
                    ? formatProgramDate(relevantWindow.deadline, language)
                    : getAvailabilityLabel(status, language)}
                </span>
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {relevantWindow
                    ? formatDeadlineCountdown(relevantWindow.deadline, t, now)
                    : t.deadlinePassed}
                </span>
              </>
            ) : status === "Not Open" ? (
              <>
                <Clock className="h-4 w-4 text-foreground/70" aria-hidden="true" />
                <span>
                  {nextOpenDate
                    ? t.opensOn(formatProgramDate(nextOpenDate, language))
                    : getAvailabilityLabel(status, language)}
                </span>
              </>
            ) : (
              <>
                <CalendarDays className="h-4 w-4 text-foreground/70" aria-hidden="true" />
                <span>
                  {relevantWindow
                    ? formatProgramDate(relevantWindow.deadline, language)
                    : getAvailabilityLabel(status, language)}
                </span>
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {t.deadlinePassed}
                </span>
              </>
            )}
          </div>
          {status === "Not Open" ? (
            <div className="text-xs font-medium text-muted-foreground">
              {t.cycle}: {relevantWindow?.intake ?? "-"} · {t.applicationDeadline}:{" "}
              {relevantWindow ? formatProgramDate(relevantWindow.deadline, language) : "-"}
            </div>
          ) : null}
          <div className="border-t border-border pt-3 text-xs leading-5">
            <div>
              {copy.verified}: {formatLastVerified(language)}
            </div>
            <div>{copy.source}</div>
            <Link className="font-medium text-foreground hover:underline" href={`/contact?program=${program.id}`}>
              {copy.report}
            </Link>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={`/program/${program.id}`}>{t.viewDetails}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
