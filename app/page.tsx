"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BookmarkCheck,
  CalendarCheck,
  CalendarDays,
  Clock,
  ExternalLink,
  MapPin,
  ShieldCheck,
  SlidersHorizontal
} from "lucide-react";

import FavoriteButton from "@/components/FavoriteButton";
import GoogleAdHolder from "@/components/GoogleAdHolder";
import { useLanguage } from "@/components/LanguageProvider";
import PaginationControls from "@/components/PaginationControls";
import SearchBar from "@/components/SearchBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentDate } from "@/components/useCurrentDate";
import { catalogMeta, formatLastVerified } from "@/lib/catalog-meta";
import {
  formatProgramDate,
  getAvailabilityLabel,
  getGreLabel,
  getLevelLabel,
  getStateLabel,
  type Language
} from "@/lib/i18n";
import {
  getAvailabilityTone,
  getDaysUntilDeadline,
  getDegreeGroup,
  getGreTone,
  getNextApplicationOpenDate,
  getProgramStatus,
  getRelevantApplicationWindow,
  programs,
  type DegreeGroup,
  type Program
} from "@/lib/programs";

const allStates = Array.from(new Set(programs.map((program) => program.state))).sort();
const degreeTabs: DegreeGroup[] = ["Undergraduate", "Master", "Doctoral"];
const schoolCardsPerPage = 8;

const homeCopy = {
  zh: {
    valueCards: [
      {
        title: "查截止日期",
        description: "按开放状态和截止日期排序，先处理最紧急的项目。"
      },
      {
        title: "查官方申请链接",
        description: "集中整理项目官网、录取页、国际学生页和申请入口。"
      },
      {
        title: "保存/对比候选项目",
        description: "无需账号，把候选项目保存在本地清单里继续筛选。"
      }
    ],
    verified: "最后核验",
    officialSource: "官方来源优先",
    cleanAudit: "当前无坏链接或待复核截止日期",
    sourceNote: "提交申请前请以学校官网为准。",
    reportIssue: "报告问题"
  },
  en: {
    valueCards: [
      {
        title: "Check deadlines",
        description: "Sort by open status and deadline so urgent programs are visible first."
      },
      {
        title: "Find official links",
        description: "Use curated program, admission, international, and application pages."
      },
      {
        title: "Save and compare",
        description: "Keep candidate programs locally without creating an account."
      }
    ],
    verified: "Last verified",
    officialSource: "Official sources first",
    cleanAudit: "No broken links or deadline reviews",
    sourceNote: "Confirm with the school website before applying.",
    reportIssue: "Report issue"
  }
} as const;

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("All");
  const [activeDegree, setActiveDegree] = useState<DegreeGroup>("Undergraduate");
  const [greFilter, setGreFilter] = useState("All");
  const { language, t } = useLanguage();
  const copy = homeCopy[language];
  const now = useCurrentDate();

  const programsMatchingFilters = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return programs.filter((program) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          program.school,
          program.program,
          program.state,
          program.degree,
          getDegreeGroupLabel(getDegreeGroup(program), "zh"),
          getDegreeGroupLabel(getDegreeGroup(program), "en"),
          getLevelLabel(program.level, "zh"),
          getLevelLabel(program.level, "en"),
          getAvailabilityLabel(getProgramStatus(program, now), "zh"),
          getAvailabilityLabel(getProgramStatus(program, now), "en"),
          getStateLabel(program.state, "zh"),
          getStateLabel(program.state, "en")
      ].some((field) => field.toLowerCase().includes(normalizedQuery));
      const matchesState = stateFilter === "All" || program.state === stateFilter;
      const matchesGre =
        greFilter === "All" ||
        (greFilter === "Required" && program.gre === true) ||
        (greFilter === "Not Required" && program.gre === false) ||
        (greFilter === "Optional" && program.gre === "Optional");

      return matchesQuery && matchesState && matchesGre;
    });
  }, [greFilter, now, query, stateFilter]);

  const degreeTabCounts = useMemo(
    () =>
      degreeTabs.reduce<Record<DegreeGroup, number>>(
        (counts, degreeGroup) => ({
          ...counts,
          [degreeGroup]: programsMatchingFilters.filter(
            (program) => getDegreeGroup(program) === degreeGroup
          ).length
        }),
        {
          Undergraduate: 0,
          Master: 0,
          Doctoral: 0
        }
      ),
    [programsMatchingFilters]
  );

  const filteredPrograms = useMemo(
    () =>
      programsMatchingFilters.filter((program) => getDegreeGroup(program) === activeDegree),
    [activeDegree, programsMatchingFilters]
  );

  const openPrograms = useMemo(
    () =>
      filteredPrograms
        .filter((program) => getProgramStatus(program, now) === "Open")
        .sort((left, right) => compareOpenPrograms(left, right, now)),
    [filteredPrograms, now]
  );

  const notOpenPrograms = useMemo(
    () =>
      filteredPrograms
        .filter((program) => getProgramStatus(program, now) !== "Open")
        .sort((left, right) => compareNotOpenPrograms(left, right, now)),
    [filteredPrograms, now]
  );

  const resetFilters = () => {
    setQuery("");
    setStateFilter("All");
    setGreFilter("All");
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div>
          <Badge variant="secondary" className="mb-4">
            {t.heroBadge}
          </Badge>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
            {t.heroTitle}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            {t.heroDescription}
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {copy.valueCards.map((card, index) => {
              const Icon = [CalendarCheck, ExternalLink, BookmarkCheck][index];

              return (
                <div key={card.title} className="rounded-lg border border-border bg-card p-4 shadow-soft">
                  <Icon className="mb-3 h-5 w-5 text-primary" aria-hidden="true" />
                  <h2 className="text-sm font-semibold">{card.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {card.description}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              {copy.verified}: {formatLastVerified(language)}
            </span>
            <span>{copy.officialSource}</span>
            {catalogMeta.summary.brokenLinks === 0 &&
            catalogMeta.summary.programsNeedingDeadlineReview === 0 ? (
              <span>{copy.cleanAudit}</span>
            ) : null}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-soft">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            {t.filters}
          </div>
          <div className="grid gap-3">
            <SearchBar
              value={query}
              onChange={setQuery}
              label={t.searchLabel}
              placeholder={t.searchPlaceholder}
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <FilterSelect
                label={t.state}
                value={stateFilter}
                onChange={setStateFilter}
                options={[
                  { label: t.all, value: "All" },
                  ...allStates.map((state) => ({
                    label: getStateLabel(state, language),
                    value: state
                  }))
                ]}
              />
              <FilterSelect
                label={t.gre}
                value={greFilter}
                onChange={setGreFilter}
                options={[
                  { label: t.all, value: "All" },
                  { label: t.required, value: "Required" },
                  { label: t.optional, value: "Optional" },
                  { label: t.notRequired, value: "Not Required" }
                ]}
              />
            </div>
            <Button variant="ghost" onClick={resetFilters} type="button">
              {t.resetFilters}
            </Button>
          </div>
        </div>
      </section>

      <section className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{t.programs}</h2>
          <p className="text-sm text-muted-foreground">
            {t.programCount(filteredPrograms.length, programsMatchingFilters.length)}
          </p>
        </div>
      </section>

      <DegreeTabs
        activeDegree={activeDegree}
        counts={degreeTabCounts}
        language={language}
        onChange={setActiveDegree}
      />

      {filteredPrograms.length > 0 ? (
        <div className="grid gap-8">
          <ProgramGroup
            title={t.openApplicationPrograms}
            countLabel={t.groupProgramCount(openPrograms.length)}
            items={openPrograms}
            now={now}
          />
          {openPrograms.length > 0 && notOpenPrograms.length > 0 ? (
            <GoogleAdHolder className="my-1" />
          ) : null}
          <ProgramGroup
            title={t.notOpenApplicationPrograms}
            countLabel={t.groupProgramCount(notOpenPrograms.length)}
            items={notOpenPrograms}
            now={now}
          />
        </div>
      ) : (
        <section className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <h2 className="text-lg font-semibold">{t.noPrograms}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t.noProgramsDescription}
          </p>
        </section>
      )}
    </main>
  );
}

function ProgramGroup({
  title,
  countLabel,
  items,
  now
}: {
  title: string;
  countLabel: string;
  items: Program[];
  now: Date;
}) {
  const [page, setPage] = useState(1);
  const schoolGroups = useMemo(() => groupProgramsBySchool(items), [items]);
  const totalPages = Math.max(1, Math.ceil(schoolGroups.length / schoolCardsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pageGroups = schoolGroups.slice(
    (currentPage - 1) * schoolCardsPerPage,
    currentPage * schoolCardsPerPage
  );

  useEffect(() => {
    setPage((current) => Math.min(Math.max(current, 1), totalPages));
  }, [totalPages]);

  useEffect(() => {
    setPage(1);
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{countLabel}</p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {pageGroups.map((group) => (
          <SchoolProgramCard key={group.school} group={group} now={now} />
        ))}
      </div>
      <div className="mt-5">
        <PaginationControls
          page={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </section>
  );
}

type SchoolProgramGroup = {
  school: string;
  state: string;
  programs: Program[];
};

function SchoolProgramCard({
  group,
  now
}: {
  group: SchoolProgramGroup;
  now: Date;
}) {
  const { language, t } = useLanguage();
  const openCount = group.programs.filter((program) => getProgramStatus(program, now) === "Open").length;

  return (
    <article className="flex h-full flex-col rounded-lg border border-border bg-card p-4 shadow-soft">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="min-w-0">
          <h4 className="text-lg font-semibold leading-tight">{group.school}</h4>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-foreground/70" aria-hidden="true" />
              {getStateLabel(group.state, language)}
            </span>
            <Badge variant="muted">{t.groupProgramCount(group.programs.length)}</Badge>
            {openCount > 0 ? (
              <Badge variant="default">{getAvailabilityLabel("Open", language)} {openCount}</Badge>
            ) : null}
          </div>
        </div>
      </header>

      <div className="grid flex-1 gap-3">
        {group.programs.map((program) => (
          <ProgramRow key={program.id} program={program} now={now} />
        ))}
      </div>
    </article>
  );
}

function ProgramRow({ program, now }: { program: Program; now: Date }) {
  const { language, t } = useLanguage();
  const copy = homeCopy[language];
  const status = getProgramStatus(program, now);
  const isOpen = status === "Open";
  const nextOpenDate = getNextApplicationOpenDate(program, now);
  const relevantWindow = getRelevantApplicationWindow(program, now);

  return (
    <div className="grid gap-3 rounded-md border border-border bg-background p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <div className="mb-2 flex items-start justify-between gap-3 md:hidden">
          <h5 className="text-sm font-semibold leading-6">{program.program}</h5>
          <FavoriteButton programId={program.id} compact />
        </div>
        <h5 className="mb-2 hidden text-sm font-semibold leading-6 md:block">{program.program}</h5>
        <div className="flex flex-wrap gap-2">
          <Badge variant="muted">{getLevelLabel(program.level, language)}</Badge>
          <Badge variant="muted">{program.degree}</Badge>
          <Badge variant={getAvailabilityTone(status)}>
            {getAvailabilityLabel(status, language)}
          </Badge>
          <Badge variant={getGreTone(program.gre)}>{getGreLabel(program.gre, language)}</Badge>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {isOpen ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-foreground/70" aria-hidden="true" />
                {relevantWindow
                  ? formatProgramDate(relevantWindow.deadline, language)
                  : getAvailabilityLabel(status, language)}
              </span>
              <span className="font-medium text-foreground">
                {relevantWindow
                  ? formatDeadlineCountdown(relevantWindow.deadline, t, now)
                  : t.deadlinePassed}
              </span>
            </>
          ) : status === "Not Open" ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-foreground/70" aria-hidden="true" />
                {nextOpenDate
                  ? t.opensOn(formatProgramDate(nextOpenDate, language))
                  : getAvailabilityLabel(status, language)}
              </span>
              <span>
                {t.applicationDeadline}:{" "}
                {relevantWindow ? formatProgramDate(relevantWindow.deadline, language) : "-"}
              </span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-foreground/70" aria-hidden="true" />
              {t.deadlinePassed}
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>
            {copy.verified}: {formatLastVerified(language)}
          </span>
          <span>{copy.officialSource}</span>
          <Link className="font-medium text-foreground hover:underline" href={`/contact?program=${program.id}`}>
            {copy.reportIssue}
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:block">
          <FavoriteButton programId={program.id} compact />
        </div>
        <Button asChild size="sm" className="w-full md:w-auto">
          <Link href={`/program/${program.id}`}>{t.viewDetails}</Link>
        </Button>
      </div>
    </div>
  );
}

function groupProgramsBySchool(items: Program[]): SchoolProgramGroup[] {
  const groups = new Map<string, SchoolProgramGroup>();

  for (const program of items) {
    const group = groups.get(program.school) ?? {
      school: program.school,
      state: program.state,
      programs: []
    };

    group.programs.push(program);
    groups.set(program.school, group);
  }

  return Array.from(groups.values()).sort((left, right) => {
    const stateComparison = left.state.localeCompare(right.state);

    if (stateComparison !== 0) {
      return stateComparison;
    }

    return left.school.localeCompare(right.school);
  });
}

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

function DegreeTabs({
  activeDegree,
  counts,
  language,
  onChange
}: {
  activeDegree: DegreeGroup;
  counts: Record<DegreeGroup, number>;
  language: Language;
  onChange: (degreeGroup: DegreeGroup) => void;
}) {
  return (
    <section className="mb-6 border-b border-border" aria-label="Program degree tabs">
      <div className="flex gap-1 overflow-x-auto" role="tablist">
        {degreeTabs.map((degreeGroup) => {
          const isActive = degreeGroup === activeDegree;

          return (
            <button
              key={degreeGroup}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={[
                "min-w-fit border-b-2 px-4 py-3 text-sm font-medium transition",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              ].join(" ")}
              onClick={() => onChange(degreeGroup)}
            >
              <span>{getDegreeGroupLabel(degreeGroup, language)}</span>
              <span className="ml-2 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {counts[degreeGroup]}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

type FilterSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{
    label: string;
    value: string;
  }>;
};

function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <select
        className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function getDegreeGroupLabel(degreeGroup: DegreeGroup, language: Language) {
  if (language === "zh") {
    if (degreeGroup === "Undergraduate") {
      return "本科";
    }

    return degreeGroup === "Doctoral" ? "PhD" : "研究生";
  }

  if (degreeGroup === "Doctoral") {
    return "PhD";
  }

  if (degreeGroup === "Master") {
    return "Master's";
  }

  return "Undergraduate";
}

function compareOpenPrograms(left: Program, right: Program, now: Date) {
  return compareByDateThenName(
    getRelevantApplicationWindow(left, now)?.deadline,
    getRelevantApplicationWindow(right, now)?.deadline,
    left,
    right
  );
}

function compareNotOpenPrograms(left: Program, right: Program, now: Date) {
  return compareByDateThenName(
    getNextApplicationOpenDate(left, now),
    getNextApplicationOpenDate(right, now),
    left,
    right
  );
}

function compareByDateThenName(
  leftDate: string | null | undefined,
  rightDate: string | null | undefined,
  left: Program,
  right: Program
) {
  const dateComparison = getSortTime(leftDate) - getSortTime(rightDate);

  if (dateComparison !== 0) {
    return dateComparison;
  }

  return `${left.school} ${left.program}`.localeCompare(`${right.school} ${right.program}`);
}

function getSortTime(value: string | null | undefined) {
  return value ? new Date(`${value}T12:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
}
