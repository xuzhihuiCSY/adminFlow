"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import GoogleAdHolder from "@/components/GoogleAdHolder";
import { useLanguage } from "@/components/LanguageProvider";
import ProgramCard from "@/components/ProgramCard";
import SearchBar from "@/components/SearchBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentDate } from "@/components/useCurrentDate";
import {
  getAvailabilityLabel,
  getLevelLabel,
  getStateLabel,
  type Language
} from "@/lib/i18n";
import {
  getDegreeGroup,
  getNextApplicationOpenDate,
  getProgramStatus,
  getRelevantApplicationWindow,
  programs,
  type DegreeGroup,
  type Program
} from "@/lib/programs";

const allStates = Array.from(new Set(programs.map((program) => program.state))).sort();
const degreeTabs: DegreeGroup[] = ["Undergraduate", "Master", "Doctoral"];

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("All");
  const [activeDegree, setActiveDegree] = useState<DegreeGroup>("Undergraduate");
  const [greFilter, setGreFilter] = useState("All");
  const { language, t } = useLanguage();
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
      <section className="mb-8 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((program) => (
          <ProgramCard key={program.id} program={program} now={now} />
        ))}
      </div>
    </section>
  );
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
