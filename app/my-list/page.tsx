"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookmarkX, Download, ExternalLink, Trash2 } from "lucide-react";

import {
  getFavoriteProgramIds,
  removeFavoriteProgramId
} from "@/components/FavoriteButton";
import { useLanguage } from "@/components/LanguageProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentDate } from "@/components/useCurrentDate";
import { formatProgramDate, getAvailabilityLabel } from "@/lib/i18n";
import {
  getAvailabilityTone,
  getDaysUntilDeadline,
  getProgramStatus,
  getRelevantApplicationWindow,
  programs,
  type Program
} from "@/lib/programs";

const TRACKER_KEY = "admitflow:application-tracker";

type ApplicationStatus = "to-confirm" | "preparing" | "applied" | "dropped";

type TrackerEntry = {
  status: ApplicationStatus;
  note: string;
};

type TrackerState = Record<string, TrackerEntry>;

const pageCopy = {
  zh: {
    due30: "30 天内截止",
    due60: "60 天内截止",
    due90: "90 天内截止",
    exportCsv: "导出 CSV",
    status: "状态",
    note: "备注",
    program: "项目",
    deadline: "截止日期",
    actions: "操作",
    officialApply: "官方申请",
    details: "详情",
    remove: "移除",
    notePlaceholder: "例如：需要问 advisor、TOEFL 不确定",
    statuses: {
      "to-confirm": "待确认",
      preparing: "准备材料中",
      applied: "已申请",
      dropped: "放弃"
    }
  },
  en: {
    due30: "Due in 30 days",
    due60: "Due in 60 days",
    due90: "Due in 90 days",
    exportCsv: "Export CSV",
    status: "Status",
    note: "Note",
    program: "Program",
    deadline: "Deadline",
    actions: "Actions",
    officialApply: "Official apply",
    details: "Details",
    remove: "Remove",
    notePlaceholder: "Example: ask advisor, TOEFL uncertain",
    statuses: {
      "to-confirm": "To confirm",
      preparing: "Preparing materials",
      applied: "Applied",
      dropped: "Dropped"
    }
  }
} as const;

export default function MyListPage() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [tracker, setTracker] = useState<TrackerState>({});
  const { language, t } = useLanguage();
  const copy = pageCopy[language];
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

  useEffect(() => {
    setTracker(readTracker());
  }, []);

  const savedPrograms = useMemo(
    () =>
      programs
        .filter((program) => favoriteIds.includes(program.id))
        .sort((left, right) => getDeadlineSortTime(left, now) - getDeadlineSortTime(right, now)),
    [favoriteIds, now]
  );

  const deadlineBuckets = useMemo(
    () => ({
      due30: countProgramsDueWithin(savedPrograms, now, 30),
      due60: countProgramsDueWithin(savedPrograms, now, 60),
      due90: countProgramsDueWithin(savedPrograms, now, 90)
    }),
    [now, savedPrograms]
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
        <>
          <section className="mb-5 flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-soft md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-md bg-muted px-3 py-2">
                {copy.due30}: {deadlineBuckets.due30}
              </span>
              <span className="rounded-md bg-muted px-3 py-2">
                {copy.due60}: {deadlineBuckets.due60}
              </span>
              <span className="rounded-md bg-muted px-3 py-2">
                {copy.due90}: {deadlineBuckets.due90}
              </span>
            </div>
            <Button type="button" variant="outline" onClick={() => exportCsv(savedPrograms, tracker, now)}>
              <Download className="h-4 w-4" aria-hidden="true" />
              {copy.exportCsv}
            </Button>
          </section>
          <section className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-sm">
                <thead className="bg-muted/70 text-left text-xs font-medium uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">{copy.program}</th>
                    <th className="px-4 py-3">{copy.deadline}</th>
                    <th className="px-4 py-3">{copy.status}</th>
                    <th className="px-4 py-3">{copy.note}</th>
                    <th className="px-4 py-3 text-right">{copy.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {savedPrograms.map((program) => {
                    const window = getRelevantApplicationWindow(program, now);
                    const status = getProgramStatus(program, now);

                    return (
                      <tr key={program.id} className="border-t border-border align-top">
                        <td className="px-4 py-4">
                          <div className="font-semibold">{program.school}</div>
                          <div className="mt-1 text-muted-foreground">{program.program}</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant={getAvailabilityTone(status)}>
                              {getAvailabilityLabel(status, language)}
                            </Badge>
                            <Badge variant="muted">{program.degree}</Badge>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium">
                            {window ? formatProgramDate(window.deadline, language) : "-"}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {window?.intake ?? "-"}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <select
                            className="h-10 w-44 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                            value={tracker[program.id]?.status ?? "to-confirm"}
                            onChange={(event) =>
                              updateTracker(program.id, {
                                status: event.target.value as ApplicationStatus
                              })
                            }
                          >
                            {Object.entries(copy.statuses).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-4">
                          <textarea
                            className="min-h-16 w-72 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                            onChange={(event) => updateTracker(program.id, { note: event.target.value })}
                            placeholder={copy.notePlaceholder}
                            value={tracker[program.id]?.note ?? ""}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <Button asChild size="sm" variant="outline">
                              <a href={program.links.apply} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                                {copy.officialApply}
                              </a>
                            </Button>
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/program/${program.id}`}>{copy.details}</Link>
                            </Button>
                            <Button
                              aria-label={`${copy.remove} ${program.school} ${program.program}`}
                              onClick={() => removeFavoriteProgramId(program.id)}
                              size="icon"
                              type="button"
                              variant="ghost"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
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

  function updateTracker(programId: string, patch: Partial<TrackerEntry>) {
    setTracker((current) => {
      const next = {
        ...current,
        [programId]: {
          status: current[programId]?.status ?? "to-confirm",
          note: current[programId]?.note ?? "",
          ...patch
        }
      };

      writeTracker(next);
      return next;
    });
  }
}

function readTracker(): TrackerState {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const value = window.localStorage.getItem(TRACKER_KEY);
    return value ? (JSON.parse(value) as TrackerState) : {};
  } catch {
    return {};
  }
}

function writeTracker(tracker: TrackerState) {
  window.localStorage.setItem(TRACKER_KEY, JSON.stringify(tracker));
}

function getDeadlineSortTime(program: Program, now: Date) {
  const deadline = getRelevantApplicationWindow(program, now)?.deadline;
  return deadline ? new Date(`${deadline}T23:59:59`).getTime() : Number.MAX_SAFE_INTEGER;
}

function countProgramsDueWithin(items: Program[], now: Date, days: number) {
  return items.filter((program) => {
    const deadline = getRelevantApplicationWindow(program, now)?.deadline;
    if (!deadline) {
      return false;
    }

    const daysLeft = getDaysUntilDeadline(deadline, now);
    return daysLeft >= 0 && daysLeft <= days;
  }).length;
}

function exportCsv(items: Program[], tracker: TrackerState, now: Date) {
  const rows = [
    ["School", "Program", "Status", "Note", "Deadline", "Apply URL"],
    ...items.map((program) => [
      program.school,
      program.program,
      tracker[program.id]?.status ?? "to-confirm",
      tracker[program.id]?.note ?? "",
      getRelevantApplicationWindow(program, now)?.deadline ?? "",
      program.links.apply
    ])
  ];
  const csv = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "admitflow-application-plan.csv";
  anchor.click();
  window.URL.revokeObjectURL(url);
}

function escapeCsvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
