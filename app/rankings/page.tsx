"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, ExternalLink, ListFilter, Trophy } from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import PaginationControls from "@/components/PaginationControls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStateLabel, type Language } from "@/lib/i18n";
import {
  getSchoolRankingSource,
  getSchoolRankings,
  type SchoolProfile,
  type SchoolRankingEntry
} from "@/lib/schools";

const rankings = getSchoolRankings();
const rankingSource = getSchoolRankingSource();
const allStates = Array.from(new Set(rankings.map((school) => getStateFromCity(school.city)))).sort();
const rankingRowsPerPage = 10;

const pageCopy = {
  zh: {
    badge: "学校排行榜",
    title: "按 CWUR 2026 世界大学排名查看库内学校。",
    description:
      "榜单使用 Center for World University Rankings 2026 Global 2000。这里只展示项目库里同时有本科和研究生项目、并且能匹配到 CWUR 排名的学校。",
    filters: "筛选",
    state: "州",
    schoolType: "学校类型",
    all: "全部",
    publicSchool: "公立",
    privateSchool: "私立",
    rankingBasis: "排序依据",
    worldRankAsc: "CWUR 世界排名",
    nationalRankAsc: "CWUR 美国排名",
    schoolNameAsc: "学校名称 A-Z",
    schoolCount: (shown: number, total: number) => `${shown} / ${total} 所学校`,
    sourceLabel: "排名来源",
    sourceUpdated: "更新",
    worldRank: "世界排名",
    nationalRank: "美国排名",
    score: "CWUR 分数",
    sourceInstitution: "CWUR 收录名称",
    acceptanceRate: "录取率",
    dataScope: "录取率口径",
    updated: "录取率更新",
    programCatalog: "项目覆盖",
    programCoverage: (undergraduate: number, graduate: number) =>
      `本科 ${undergraduate} 个 / 研究生 ${graduate} 个`,
    noReliableData: "暂无可靠公开数据",
    noSchools: "没有符合条件的学校",
    noSchoolsDescription: "调整筛选条件以查看其他学校。",
    viewRankingSource: "查看排名来源",
    viewSchoolRanking: "查看学校排名",
    rank: "排名"
  },
  en: {
    badge: "School Rankings",
    title: "View catalog schools by CWUR 2026 world ranking.",
    description:
      "The list uses the Center for World University Rankings 2026 Global 2000. It only shows schools that have both undergraduate and graduate programs in the catalog and can be matched to CWUR.",
    filters: "Filters",
    state: "State",
    schoolType: "School Type",
    all: "All",
    publicSchool: "Public",
    privateSchool: "Private",
    rankingBasis: "Ranking Basis",
    worldRankAsc: "CWUR world rank",
    nationalRankAsc: "CWUR U.S. rank",
    schoolNameAsc: "School name A-Z",
    schoolCount: (shown: number, total: number) => `${shown} of ${total} schools`,
    sourceLabel: "Ranking Source",
    sourceUpdated: "Updated",
    worldRank: "World Rank",
    nationalRank: "U.S. Rank",
    score: "CWUR Score",
    sourceInstitution: "CWUR Institution",
    acceptanceRate: "Acceptance Rate",
    dataScope: "Acceptance Scope",
    updated: "Acceptance Updated",
    programCatalog: "Catalog Coverage",
    programCoverage: (undergraduate: number, graduate: number) =>
      `${undergraduate} undergraduate / ${graduate} graduate`,
    noReliableData: "No reliable public data",
    noSchools: "No schools found",
    noSchoolsDescription: "Adjust the filters to view more schools.",
    viewRankingSource: "View ranking source",
    viewSchoolRanking: "View school ranking",
    rank: "Rank"
  }
} as const;

type SchoolTypeFilter = "All" | SchoolProfile["schoolType"];
type SortMode = "worldRank" | "nationalRank" | "schoolName";

export default function RankingsPage() {
  const { language } = useLanguage();
  const copy = pageCopy[language];
  const [stateFilter, setStateFilter] = useState("All");
  const [schoolTypeFilter, setSchoolTypeFilter] = useState<SchoolTypeFilter>("All");
  const [sortMode, setSortMode] = useState<SortMode>("worldRank");
  const [page, setPage] = useState(1);

  const filteredRankings = useMemo(() => {
    return rankings
      .filter((school) => {
        const state = getStateFromCity(school.city);

        return (
          (stateFilter === "All" || state === stateFilter) &&
          (schoolTypeFilter === "All" || school.schoolType === schoolTypeFilter)
        );
      })
      .sort((left, right) => {
        if (sortMode === "schoolName") {
          return left.school.localeCompare(right.school);
        }

        if (sortMode === "nationalRank") {
          return (
            left.ranking.nationalRank - right.ranking.nationalRank ||
            left.ranking.worldRank - right.ranking.worldRank
          );
        }

        return (
          left.ranking.worldRank - right.ranking.worldRank ||
          left.school.localeCompare(right.school)
        );
      });
  }, [schoolTypeFilter, sortMode, stateFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRankings.length / rankingRowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pageRankings = filteredRankings.slice(
    (currentPage - 1) * rankingRowsPerPage,
    currentPage * rankingRowsPerPage
  );

  useEffect(() => {
    setPage(1);
  }, [schoolTypeFilter, sortMode, stateFilter]);

  useEffect(() => {
    setPage((current) => Math.min(Math.max(current, 1), totalPages));
  }, [totalPages]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-8 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
        <div>
          <Badge variant="secondary" className="mb-4">
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
            {copy.badge}
          </Badge>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            {copy.description}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>
              {copy.sourceLabel}: {rankingSource.name} {rankingSource.edition}
            </span>
            <span>{copy.sourceUpdated}: {rankingSource.updated}</span>
            <Button asChild variant="outline" size="sm">
              <a href={rankingSource.url} target="_blank" rel="noreferrer">
                {copy.viewRankingSource}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-soft">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <ListFilter className="h-4 w-4" aria-hidden="true" />
            {copy.filters}
          </div>
          <div className="grid gap-3">
            <FilterSelect
              label={copy.state}
              value={stateFilter}
              onChange={setStateFilter}
              options={[
                { label: copy.all, value: "All" },
                ...allStates.map((state) => ({
                  label: getStateLabel(state, language),
                  value: state
                }))
              ]}
            />
            <FilterSelect
              label={copy.schoolType}
              value={schoolTypeFilter}
              onChange={(value) => setSchoolTypeFilter(value as SchoolTypeFilter)}
              options={[
                { label: copy.all, value: "All" },
                { label: copy.publicSchool, value: "Public" },
                { label: copy.privateSchool, value: "Private" }
              ]}
            />
            <FilterSelect
              label={copy.rankingBasis}
              value={sortMode}
              onChange={(value) => setSortMode(value as SortMode)}
              options={[
                { label: copy.worldRankAsc, value: "worldRank" },
                { label: copy.nationalRankAsc, value: "nationalRank" },
                { label: copy.schoolNameAsc, value: "schoolName" }
              ]}
            />
          </div>
        </div>
      </section>

      <section className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{copy.badge}</h2>
          <p className="text-sm text-muted-foreground">
            {copy.schoolCount(filteredRankings.length, rankings.length)}
          </p>
        </div>
        <Badge variant="outline" className="hidden gap-2 sm:inline-flex">
          <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
          {getSortLabel(sortMode, copy)}
        </Badge>
      </section>

      {filteredRankings.length > 0 ? (
        <section className="grid gap-5">
          <div className="grid gap-3">
            {pageRankings.map((school) => (
              <RankingRow
                key={school.school}
                school={school}
                language={language}
                copy={copy}
              />
            ))}
          </div>
          <PaginationControls
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </section>
      ) : (
        <section className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <h2 className="text-lg font-semibold">{copy.noSchools}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{copy.noSchoolsDescription}</p>
        </section>
      )}
    </main>
  );
}

function RankingRow({
  school,
  language,
  copy
}: {
  school: SchoolRankingEntry;
  language: Language;
  copy: typeof pageCopy[Language];
}) {
  return (
    <article className="grid gap-4 rounded-lg border border-border bg-card p-4 shadow-soft md:grid-cols-[92px_1fr_210px] md:items-center">
      <div className="flex items-center gap-3 md:grid md:gap-1">
        <span className="text-xs font-medium uppercase text-muted-foreground">{copy.worldRank}</span>
        <span className="text-3xl font-semibold tabular-nums text-foreground">
          #{school.ranking.worldRank}
        </span>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold">{school.school}</h3>
          <Badge variant="muted">
            {school.schoolType === "Public" ? copy.publicSchool : copy.privateSchool}
          </Badge>
          <Badge variant="outline">{getStateLabel(getStateFromCity(school.city), language)}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{school.city}</p>
        <div className="mt-3 grid gap-2 text-sm text-muted-foreground lg:grid-cols-2">
          <DataPoint label={copy.nationalRank} value={`#${school.ranking.nationalRank}`} />
          <DataPoint label={copy.score} value={school.ranking.score.toFixed(1)} />
          <DataPoint label={copy.sourceInstitution} value={school.ranking.sourceInstitution} />
          <DataPoint
            label={copy.programCatalog}
            value={copy.programCoverage(
              school.undergraduateProgramCount,
              school.graduateProgramCount
            )}
          />
          <DataPoint label={copy.dataScope} value={school.acceptanceRateScope} />
          <DataPoint label={copy.updated} value={school.updated} />
        </div>
      </div>
      <div className="grid gap-3 md:justify-items-end">
        <div className="md:text-right">
          <p className="text-xs font-medium uppercase text-muted-foreground">{copy.acceptanceRate}</p>
          <p className="text-2xl font-semibold">
            {school.acceptanceRate ?? copy.noReliableData}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={school.ranking.sourceUrl} target="_blank" rel="noreferrer">
            {copy.viewSchoolRanking}
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </Button>
      </div>
    </article>
  );
}

function DataPoint({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-medium text-foreground">{label}: </span>
      {value}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <select
        className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
        value={value}
        onChange={(event) => onChange(event.target.value)}
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

function getStateFromCity(city: string) {
  return city.split(",").at(-1)?.trim() ?? city;
}

function getSortLabel(sortMode: SortMode, copy: typeof pageCopy[Language]) {
  if (sortMode === "nationalRank") {
    return copy.nationalRankAsc;
  }

  if (sortMode === "schoolName") {
    return copy.schoolNameAsc;
  }

  return copy.worldRankAsc;
}
