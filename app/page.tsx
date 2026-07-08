"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  ExternalLink,
  FileText,
  Landmark,
  LayoutGrid,
  MapPin,
  Plane,
  RotateCcw,
  SearchCheck,
  ShieldCheck,
  Smartphone,
  SlidersHorizontal,
  Stamp,
  Table2,
  X,
  ArrowRight
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
const trackerRowsPerPage = 25;
const majorFilters = [
  "All",
  "Computer Science",
  "Data Science",
  "Information",
  "Analytics / Statistics",
  "Software Engineering",
  "Electrical / Computer Engineering",
  "MBA"
] as const;

type MajorFilter = (typeof majorFilters)[number];

const homeCopy = {
  zh: {
    roadmapEyebrow: "美国留学流程 Roadmap",
    roadmapDescription:
      "从找学校到回国学历认证，把关键节点按真实顺序串起来；需要官方办理入口的环节会单独标出。",
    roadmapSteps: [
      {
        title: "找学校",
        description: "确定方向和 shortlist。",
        detail:
          "先把目标缩小到可执行的范围：专业方向、预算上限、地理位置、学校层级、就业目标和申请批次。建议把学校分成冲刺、匹配、保底三类，再用截止日期和项目要求筛掉明显不合适的选项。",
        links: []
      },
      {
        title: "申请学校",
        description: "提交材料和网申。",
        detail:
          "按学校要求提交网申、成绩单、语言成绩、标化成绩、简历、文书、推荐信和申请费。本科申请常见入口包括 Common App、UC Application 和 Cal State Apply；研究生项目通常还是项目官网或学校研究生院入口更直接。Cal State Apply 本科和部分硕士/研究生申请都可能用到，但具体仍以项目官网说明为准。",
        links: [
          {
            label: "Common App（本科申请可用）",
            href: "https://www.commonapp.org/"
          },
          {
            label: "UC Application（UC 本科申请）",
            href: "https://apply.universityofcalifornia.edu/"
          },
          {
            label: "Cal State Apply（本科/部分硕士；官网更直接）",
            href: "https://www.calstate.edu/apply"
          }
        ]
      },
      {
        title: "Offer + I-20",
        description: "确认入读并拿 I-20。",
        detail:
          "收到 offer 后不要只看学校名，要一起比较专业匹配、总费用、奖学金、毕业要求、就业位置和押金截止日期。确认入读后，学校通常会要求提交护照、资金证明等材料，然后签发 I-20。I-20 信息要和护照、录取项目、入学日期一致。",
        links: []
      },
      {
        title: "F-1 签证",
        description: "完成学生签证。",
        detail:
          "拿到 I-20 后再进入签证流程：缴 SEVIS I-901 费、填写 DS-160、预约签证、准备面签材料并参加面签。常见材料包括：有效护照、I-20、DS-160 确认页、签证预约确认页、SEVIS I-901 缴费收据、签证照片、录取信、资金证明、成绩单/在读或毕业证明、语言或标化成绩、简历/学习计划，以及能说明学习目的和回国约束的补充材料。重点核对学校名称、SEVIS ID、项目开始日期和资金金额。签证政策和使领馆要求会变化，办理前以美国国务院和预约系统要求为准。",
        links: [
          {
            label: "F-1 签证官方入口",
            href: "https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html"
          }
        ]
      },
      {
        title: "入境美国 + 新生报到",
        description: "入境并完成 check-in。",
        detail:
          "入境时随身携带护照、F-1 签证、I-20、录取材料、住宿信息和资金证明，不要放托运行李。到校后尽快完成国际学生 check-in、地址更新、选课、疫苗/保险、学生证和 orientation。很多学校会给 check-in 截止日期，错过可能影响 SEVIS 状态。",
        links: []
      },
      {
        title: "银行卡/手机卡 + 驾照",
        description: "处理生活基础设施。",
        detail:
          "落地后先解决通讯和支付：手机卡用于验证码、学校系统和日常联系，银行账户用于缴费、收款和信用记录。驾照或州 ID 通常需要护照、I-20、I-94、住址证明等材料；各州规则不同，建议先查所在州 DMV 要求。",
        links: []
      },
      {
        title: "CPT/OPT",
        description: "规划实习和工作授权。",
        detail:
          "CPT 通常用于在读期间与课程相关的实习，OPT 通常用于毕业前后申请工作授权。不要等拿到 offer 才第一次了解规则，很多学校对 CPT 课程、学期、全职/兼职和申请时间都有要求。OPT 也有申请窗口和材料要求，提前和 DSO 确认最稳。",
        links: []
      },
      {
        title: "毕业 + 国内学历认证",
        description: "毕业后按需做认证。",
        detail:
          "毕业前确认学位授予时间、最终成绩单、毕业证/学位证明、OPT 或离境安排。回国就业、落户、升学、考公考编或参加部分资格考试时，可能需要办理国（境）外学历学位认证。认证通常需要学位证书、护照/签证、出入境记录等材料，以教育部留学服务中心要求为准。",
        links: [
          {
            label: "学历认证官方入口",
            href: "https://zwfw.cscse.edu.cn/"
          }
        ]
      }
    ],
    verified: "最后核验",
    officialSource: "官方来源优先",
    cleanAudit: "当前无坏链接或待复核截止日期",
    sourceNote: "提交申请前请以学校官网为准。",
    openPrograms: "进入项目库筛学校",
    searchPrograms: "搜索学校/专业",
    manageList: "管理我的清单",
    catalogEyebrow: "项目库",
    catalogTitle: "到选校阶段，再用项目库对比学校和专业。",
    catalogDescription:
      "这里集中整理申请开放状态、截止日期、GRE/TOEFL 要求和学校官方申请入口。默认会显示未开放项目，方便提前规划。",
    major: "专业方向",
    viewTracker: "任务表格",
    viewSchools: "学校卡片",
    trackerNote: "一行一个项目，适合快速筛选、保存和跳转官方申请。",
    schoolNote: "按学校合并项目，适合对比同一学校的本科、硕士和 PhD。",
    deadline: "截止日期",
    nextStep: "下一步",
    officialApply: "官方申请",
    noDate: "暂无日期",
    showNotOpen: "显示未开放项目"
  },
  en: {
    roadmapEyebrow: "US Study Roadmap",
    roadmapDescription:
      "Follow the actual path from school search to China credential verification. Official portals are shown only where they are needed.",
    roadmapSteps: [
      {
        title: "Find schools",
        description: "Define direction and shortlist.",
        detail:
          "Narrow the search into an executable list: major, budget cap, location, school tier, career goals, and application rounds. A practical shortlist usually includes reach, match, and safer options, then filters out programs that do not fit deadlines, cost, or requirements.",
        links: []
      },
      {
        title: "Apply",
        description: "Submit materials and forms.",
        detail:
          "Submit applications, transcripts, language scores, standardized tests, resume, essays, recommendation letters, and fees according to each school. For undergraduate applications, Common App, UC Application, and Cal State Apply are common portals. Graduate programs usually use the program page or graduate school portal directly. Cal State Apply may be used for undergraduate and some master's/graduate applications, but the program website is still the best source of truth.",
        links: [
          {
            label: "Common App (undergraduate)",
            href: "https://www.commonapp.org/"
          },
          {
            label: "UC Application (UC undergraduate)",
            href: "https://apply.universityofcalifornia.edu/"
          },
          {
            label: "Cal State Apply (undergrad / some graduate)",
            href: "https://www.calstate.edu/apply"
          }
        ]
      },
      {
        title: "Offer + I-20",
        description: "Commit and get I-20.",
        detail:
          "After admission, compare more than the school name: program fit, total cost, funding, graduation requirements, career location, and deposit deadlines. Once you commit, the school usually asks for passport and financial documents, then issues the I-20. Check that your name, school, program, SEVIS ID, and start date are correct.",
        links: []
      },
      {
        title: "F-1 visa",
        description: "Complete student visa.",
        detail:
          "After receiving the I-20, move through the visa process: pay the SEVIS I-901 fee, complete DS-160, schedule the appointment, prepare materials, and attend the interview. Common materials include a valid passport, I-20, DS-160 confirmation page, appointment confirmation, SEVIS I-901 fee receipt, visa photo, admission letter, financial documents, transcripts or enrollment/graduation proof, language or standardized test scores, resume or study plan, and supporting documents that explain your study purpose and ties after study. Carefully check school name, SEVIS ID, program start date, and funding amount. Visa rules and consulate instructions can change, so confirm requirements on the official State Department page and the appointment system.",
        links: [
          {
            label: "Official F-1 visa portal",
            href: "https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html"
          }
        ]
      },
      {
        title: "Enter U.S. + orientation",
        description: "Arrive and check in.",
        detail:
          "Carry passport, F-1 visa, I-20, admission documents, housing information, and funding proof with you, not in checked luggage. After arrival, complete international student check-in, address updates, course registration, insurance, immunization, student ID, and orientation steps. Missing a school check-in deadline can affect SEVIS status.",
        links: []
      },
      {
        title: "Bank / SIM + driver license",
        description: "Set up daily-life basics.",
        detail:
          "Set up phone service first for verification codes and daily communication, then open a bank account for tuition payments, transfers, and spending. A driver license or state ID usually requires passport, I-20, I-94, and address proof, but rules vary by state. Check the local DMV before going.",
        links: []
      },
      {
        title: "CPT / OPT",
        description: "Plan work authorization.",
        detail:
          "CPT is commonly used for internships related to the curriculum during study; OPT is commonly used for work authorization before or after completion. Do not wait until you have an offer to learn the rules. Schools often have specific requirements for coursework, semesters, full-time/part-time work, and application timing. Confirm with your DSO early.",
        links: []
      },
      {
        title: "Graduate + China verification",
        description: "Graduate and verify if needed.",
        detail:
          "Before leaving school, confirm degree conferral, final transcript, diploma or degree proof, OPT or departure timing, and document access after graduation. If returning to China for employment, settlement, further study, civil service exams, or professional qualifications, China credential verification may be needed. Follow the CSCSE portal requirements for documents and timing.",
        links: [
          {
            label: "Official verification portal",
            href: "https://zwfw.cscse.edu.cn/"
          }
        ]
      }
    ],
    verified: "Last verified",
    officialSource: "Official sources first",
    cleanAudit: "No broken links or deadline reviews",
    sourceNote: "Confirm with the school website before applying.",
    openPrograms: "Open program catalog",
    searchPrograms: "Search school or major",
    manageList: "Manage my list",
    catalogEyebrow: "Program catalog",
    catalogTitle: "When you are ready to shortlist, compare schools and programs here.",
    catalogDescription:
      "This catalog brings open status, deadlines, GRE/TOEFL requirements, and official application links into one place. Not-yet-open programs are shown by default for planning.",
    major: "Major",
    viewTracker: "Tracker table",
    viewSchools: "School cards",
    trackerNote: "One row per program for fast filtering, saving, and official apply links.",
    schoolNote: "Grouped by school for comparing undergraduate, master's, and PhD options.",
    deadline: "Deadline",
    nextStep: "Next step",
    officialApply: "Official apply",
    noDate: "No date",
    showNotOpen: "Show not-yet-open programs"
  }
} as const;

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("All");
  const [activeDegree, setActiveDegree] = useState<DegreeGroup>("Undergraduate");
  const [majorFilter, setMajorFilter] = useState<MajorFilter>("All");
  const [greFilter, setGreFilter] = useState("All");
  const [showNotOpen, setShowNotOpen] = useState(true);
  const [viewMode, setViewMode] = useState<"tracker" | "schools">("tracker");
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
      const matchesMajor = majorFilter === "All" || getProgramMajor(program) === majorFilter;
      const matchesGre =
        greFilter === "All" ||
        (greFilter === "Required" && program.gre === true) ||
        (greFilter === "Not Required" && program.gre === false) ||
        (greFilter === "Optional" && program.gre === "Optional");

      return matchesQuery && matchesState && matchesMajor && matchesGre;
    });
  }, [greFilter, majorFilter, now, query, stateFilter]);

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
      programsMatchingFilters.filter((program) => {
        const matchesDegree = getDegreeGroup(program) === activeDegree;
        const matchesVisibility = showNotOpen || getProgramStatus(program, now) === "Open";

        return matchesDegree && matchesVisibility;
      }),
    [activeDegree, now, programsMatchingFilters, showNotOpen]
  );

  const activeDegreePrograms = useMemo(
    () => programsMatchingFilters.filter((program) => getDegreeGroup(program) === activeDegree),
    [activeDegree, programsMatchingFilters]
  );

  const trackerPrograms = useMemo(
    () => [...filteredPrograms].sort((left, right) => compareTrackerPrograms(left, right, now)),
    [filteredPrograms, now]
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
    setMajorFilter("All");
    setGreFilter("All");
    setShowNotOpen(true);
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-8 grid gap-6 border-b border-border/80 pb-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
        <div>
          <Badge variant="secondary" className="mb-4">
            {t.heroBadge}
          </Badge>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
            {t.heroTitle}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
            {t.heroDescription}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <a href="#program-library">{copy.openPrograms}</a>
            </Button>
            <Button asChild variant="outline">
              <a href="#roadmap">{copy.roadmapEyebrow}</a>
            </Button>
            <Button asChild variant="outline">
              <Link href="/my-list">{copy.manageList}</Link>
            </Button>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-soft">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <BookOpenCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            {copy.roadmapEyebrow}
          </div>
          <div className="grid gap-3 text-sm text-muted-foreground">
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
      </section>

      <RoadmapPanel />

      <section id="program-library" className="mt-10 grid gap-6">
        <div className="max-w-3xl">
          <Badge variant="outline" className="mb-3">
            {copy.catalogEyebrow}
          </Badge>
          <h2 className="text-2xl font-semibold tracking-normal text-foreground">
            {copy.catalogTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {copy.catalogDescription}
          </p>
        </div>

        <div
          id="program-filters"
          className="rounded-lg border border-border bg-card p-3 shadow-soft sm:p-4"
        >
          <div className="grid gap-3 lg:grid-cols-[minmax(280px,1.25fr)_minmax(0,1.9fr)_190px] lg:items-end">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                {t.filters}
              </div>
              <SearchBar
                value={query}
                onChange={setQuery}
                label={t.searchLabel}
                placeholder={t.searchPlaceholder}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
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
              <FilterSelect
                label={copy.major}
                value={majorFilter}
                onChange={(value) => setMajorFilter(value as MajorFilter)}
                options={majorFilters.map((major) => ({
                  label: getMajorFilterLabel(major, language),
                  value: major
                }))}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end lg:grid-cols-1">
              <label className="flex h-10 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 text-sm font-medium">
                <span className="truncate">{copy.showNotOpen}</span>
                <input
                  type="checkbox"
                  checked={showNotOpen}
                  onChange={(event) => setShowNotOpen(event.target.checked)}
                  className="sr-only"
                />
                <span
                  className={[
                    "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                    showNotOpen ? "bg-primary" : "bg-muted"
                  ].join(" ")}
                  aria-hidden="true"
                >
                  <span
                    className={[
                      "absolute top-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-transform",
                      showNotOpen ? "translate-x-4" : "translate-x-0.5"
                    ].join(" ")}
                  />
                </span>
              </label>
              <Button
                className="h-10 justify-center"
                variant="ghost"
                onClick={resetFilters}
                type="button"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {t.resetFilters}
              </Button>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <section className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">{t.programs}</h2>
              <p className="text-sm text-muted-foreground">
                {t.programCount(filteredPrograms.length, activeDegreePrograms.length)}
              </p>
            </div>
            <div className="hidden rounded-lg border border-border bg-card p-1 shadow-soft lg:flex">
              <Button
                type="button"
                size="sm"
                variant={viewMode === "tracker" ? "secondary" : "ghost"}
                onClick={() => setViewMode("tracker")}
              >
                <Table2 className="h-4 w-4" aria-hidden="true" />
                {copy.viewTracker}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewMode === "schools" ? "secondary" : "ghost"}
                onClick={() => setViewMode("schools")}
              >
                <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                {copy.viewSchools}
              </Button>
            </div>
          </section>

          <DegreeTabs
            activeDegree={activeDegree}
            counts={degreeTabCounts}
            language={language}
            onChange={setActiveDegree}
          />

          {filteredPrograms.length > 0 ? (
            <div id="open-programs">
              <div className="lg:hidden">
                <SchoolCatalog openPrograms={openPrograms} notOpenPrograms={notOpenPrograms} now={now} />
              </div>
              <div className="hidden lg:block">
                {viewMode === "tracker" ? (
                  <ProgramTrackerTable items={trackerPrograms} now={now} />
                ) : (
                  <SchoolCatalog openPrograms={openPrograms} notOpenPrograms={notOpenPrograms} now={now} />
                )}
              </div>
            </div>
          ) : (
            <section className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
              <h2 className="text-lg font-semibold">{t.noPrograms}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t.noProgramsDescription}
              </p>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}

const roadmapIcons = [
  SearchCheck,
  FileText,
  ClipboardCheck,
  Stamp,
  Plane,
  Smartphone,
  BriefcaseBusiness,
  Landmark
] as const;

function RoadmapPanel() {
  const { language } = useLanguage();
  const copy = homeCopy[language];
  const stages = getRoadmapStages(copy.roadmapSteps, language);
  const [selectedStep, setSelectedStep] = useState<RoadmapMilestoneStep | null>(null);

  return (
    <section
      id="roadmap"
      className="border-b border-border/80 pb-10"
      aria-labelledby="roadmap-title"
    >
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <Badge variant="secondary" className="mb-2">
            {copy.roadmapEyebrow}
          </Badge>
          <h2 id="roadmap-title" className="text-2xl font-semibold tracking-normal">
            {language === "zh"
              ? "从找学校到国内学历认证"
              : "From school search to credential verification"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {copy.roadmapDescription}
          </p>
        </div>
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground lg:max-w-xs lg:justify-end lg:text-right">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          {copy.sourceNote}
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
        <ol className="grid divide-y divide-border lg:grid-cols-2 lg:divide-x-0 lg:divide-y xl:grid-cols-4 xl:divide-x xl:divide-y-0">
          {stages.map((stage, stageIndex) => (
            <li
              key={stage.label}
              className="relative min-w-0 p-4 sm:p-5"
            >
              {stageIndex < stages.length - 1 ? (
                <ArrowRight
                  className="absolute right-3 top-6 hidden h-4 w-4 text-muted-foreground xl:block"
                  aria-hidden="true"
                />
              ) : null}
              <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    {stage.label}
                  </div>
                  <h3 className="mt-1 text-base font-semibold leading-6">{stage.title}</h3>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-sm font-semibold text-secondary-foreground">
                  {String(stageIndex + 1).padStart(2, "0")}
                </span>
              </div>

              <div className="grid gap-3">
                {stage.steps.map((step) => (
                  <RoadmapMilestone
                    key={step.title}
                    language={language}
                    step={step}
                    onSelect={() => setSelectedStep(step)}
                  />
                ))}
              </div>
            </li>
          ))}
        </ol>
      </div>
      {selectedStep ? (
        <RoadmapDetailDialog step={selectedStep} onClose={() => setSelectedStep(null)} />
      ) : null}
    </section>
  );
}

type RoadmapStep = (typeof homeCopy)[Language]["roadmapSteps"][number];
type RoadmapMilestoneStep = RoadmapStep & { index: number };
const importantVisaMaterials = [
  "有效护照",
  "I-20",
  "DS-160 确认页",
  "签证预约确认页",
  "SEVIS I-901 缴费收据",
  "录取信",
  "资金证明",
  "valid passport",
  "DS-160 confirmation page",
  "appointment confirmation",
  "SEVIS I-901 fee receipt",
  "admission letter",
  "financial documents"
];

function RoadmapMilestone({
  language,
  onSelect,
  step
}: {
  language: Language;
  onSelect: () => void;
  step: RoadmapMilestoneStep;
}) {
  const Icon = roadmapIcons[step.index] ?? CheckCircle2;
  const hasOfficialLink = step.links.length > 0;
  const detailLabel = language === "zh" ? "查看详情" : "View details";
  const officialLabel = language === "zh" ? " / 官方入口" : " / official portal";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "h-full w-full rounded-md border bg-background p-3 text-left transition hover:border-primary/50 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        hasOfficialLink
          ? "border-primary/50 bg-primary/5"
          : "border-border"
      ].join(" ")}
    >
      <div className="grid grid-cols-[40px_minmax(0,1fr)] items-start gap-3">
        <span
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-accent-foreground",
            hasOfficialLink ? "bg-primary text-primary-foreground" : "bg-accent"
          ].join(" ")}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="mb-1 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
            <span className="pt-0.5 text-xs font-semibold text-muted-foreground">
              {String(step.index + 1).padStart(2, "0")}
            </span>
            <h4 className="min-w-0 text-sm font-semibold leading-5">{step.title}</h4>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{step.description}</p>
          <div className="mt-2 break-words text-xs font-medium text-primary">
            {hasOfficialLink ? `${detailLabel}${officialLabel}` : detailLabel}
          </div>
        </div>
      </div>
    </button>
  );
}

function RoadmapDetailDialog({
  onClose,
  step
}: {
  onClose: () => void;
  step: RoadmapMilestoneStep;
}) {
  const Icon = roadmapIcons[step.index] ?? CheckCircle2;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="roadmap-dialog-title"
      onClick={onClose}
    >
      <div
        className="max-h-[calc(100vh-3rem)] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card p-5 shadow-soft"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 grid grid-cols-[minmax(0,1fr)_40px] items-start gap-4">
          <div className="grid min-w-0 grid-cols-[40px_minmax(0,1fr)] items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-muted-foreground">
                {String(step.index + 1).padStart(2, "0")}
              </div>
              <h3 id="roadmap-dialog-title" className="text-lg font-semibold leading-6">
                {step.title}
              </h3>
            </div>
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <RoadmapDetailContent step={step} />

        {step.links.length > 0 ? (
          <div className="mt-5 grid gap-2">
            {step.links.map((link) => (
              <Button key={link.href} asChild variant="outline" className="h-auto min-h-10 whitespace-normal">
                <a href={link.href} target="_blank" rel="noreferrer">
                  <span className="min-w-0 text-left">{link.label}</span>
                  <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                </a>
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RoadmapDetailContent({ step }: { step: RoadmapMilestoneStep }) {
  if (!isVisaStep(step)) {
    return <p className="text-sm leading-7 text-muted-foreground">{step.detail}</p>;
  }

  const sentences = step.detail.split("。").filter(Boolean);
  const englishSentences = step.detail.split(". ").filter(Boolean);
  const isChinese = step.detail.includes("常见材料包括");
  const parts = isChinese ? sentences : englishSentences;
  const intro = parts[0];
  const materialsText = parts[1] ?? "";
  const outro = parts.slice(2).join(isChinese ? "。" : ". ");
  const materials = materialsText
    .replace(/^常见材料包括：/, "")
    .replace(/^Common materials include /, "")
    .replace(/\.$/, "")
    .split(isChinese ? "、" : ", ")
    .map((material) => material.trim())
    .filter(Boolean);

  return (
    <div className="grid gap-4 text-sm leading-7 text-muted-foreground">
      <p>{formatSentence(intro, isChinese)}</p>
      <div>
        <div className="mb-2 font-medium text-foreground">
          {isChinese ? "常见材料" : "Common materials"}
        </div>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {materials.map((material) => (
            <li key={material} className="flex gap-2">
              <span className="mt-3 h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <span className="min-w-0 break-words">{renderMaterial(material)}</span>
            </li>
          ))}
        </ul>
      </div>
      {outro ? <p>{formatSentence(outro, isChinese)}</p> : null}
    </div>
  );
}

function isVisaStep(step: RoadmapMilestoneStep) {
  return step.title.includes("F-1");
}

function renderMaterial(material: string) {
  const isImportant = importantVisaMaterials.some((important) => material.includes(important));

  if (!isImportant) {
    return material;
  }

  return <span className="underline decoration-primary decoration-2 underline-offset-4">{material}</span>;
}

function formatSentence(value: string, isChinese: boolean) {
  if (!value) {
    return value;
  }

  if (isChinese) {
    return value.endsWith("。") ? value : `${value}。`;
  }

  return value.endsWith(".") ? value : `${value}.`;
}

function getRoadmapStages(steps: readonly RoadmapStep[], language: Language) {
  const stageTitles =
    language === "zh"
      ? ["申请前", "录取与签证", "落地美国", "实习毕业与回国"]
      : ["Before applying", "Admission and visa", "Arrival in the U.S.", "Work, graduation, return"];

  return stageTitles.map((title, stageIndex) => {
    const stageSteps = steps.slice(stageIndex * 2, stageIndex * 2 + 2).map((step, offset) => ({
      ...step,
      index: stageIndex * 2 + offset
    }));

    return {
      label: language === "zh" ? `阶段 ${stageIndex + 1}` : `Stage ${stageIndex + 1}`,
      title,
      steps: stageSteps
    };
  });
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
      <div className="columns-1 gap-4 lg:columns-2">
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

function SchoolCatalog({
  openPrograms,
  notOpenPrograms,
  now
}: {
  openPrograms: Program[];
  notOpenPrograms: Program[];
  now: Date;
}) {
  const { t, language } = useLanguage();
  const copy = homeCopy[language];

  return (
    <div className="grid gap-8">
      <p className="text-sm text-muted-foreground">{copy.schoolNote}</p>
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
  );
}

function ProgramTrackerTable({ items, now }: { items: Program[]; now: Date }) {
  const [page, setPage] = useState(1);
  const { language, t } = useLanguage();
  const copy = homeCopy[language];
  const totalPages = Math.max(1, Math.ceil(items.length / trackerRowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pageItems = items.slice(
    (currentPage - 1) * trackerRowsPerPage,
    currentPage * trackerRowsPerPage
  );

  useEffect(() => {
    setPage((current) => Math.min(Math.max(current, 1), totalPages));
  }, [totalPages]);

  useEffect(() => {
    setPage(1);
  }, [items]);

  return (
    <section className="grid gap-4">
      <p className="text-sm text-muted-foreground">{copy.trackerNote}</p>
      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-soft">
        <div className="hidden min-w-[1040px] grid-cols-[minmax(260px,1.8fr)_130px_170px_150px_240px] gap-3 bg-muted/70 px-4 py-3 text-xs font-medium uppercase text-muted-foreground lg:grid">
          <div>{t.programs}</div>
          <div>{t.status}</div>
          <div>{copy.deadline}</div>
          <div>GRE</div>
          <div className="text-right">{copy.nextStep}</div>
        </div>
        <div className="divide-y divide-border">
          {pageItems.map((program) => {
            const status = getProgramStatus(program, now);
            const relevantWindow = getRelevantApplicationWindow(program, now);
            const nextOpenDate = getNextApplicationOpenDate(program, now);
            const deadline = relevantWindow?.deadline;

            return (
              <article
                key={program.id}
                className="grid gap-3 px-4 py-4 lg:min-w-[1040px] lg:grid-cols-[minmax(260px,1.8fr)_130px_170px_150px_240px] lg:items-center"
              >
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{program.school}</div>
                      <Link
                        className="mt-1 block text-sm leading-5 text-muted-foreground transition hover:text-foreground"
                        href={`/program/${program.id}`}
                      >
                        {program.program}
                      </Link>
                    </div>
                    <Badge className="shrink-0 lg:hidden" variant={getAvailabilityTone(status)}>
                      {getAvailabilityLabel(status, language)}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="muted">{getLevelLabel(program.level, language)}</Badge>
                    <Badge variant="muted">{program.degree}</Badge>
                    <Badge variant="outline">{getStateLabel(program.state, language)}</Badge>
                  </div>
                </div>

                <div className="hidden lg:block">
                  <Badge variant={getAvailabilityTone(status)}>
                    {getAvailabilityLabel(status, language)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:contents">
                  <div className="rounded-md border border-border bg-background p-3 lg:border-0 lg:bg-transparent lg:p-0">
                    <p className="mb-1 text-xs font-medium text-muted-foreground lg:hidden">
                      {copy.deadline}
                    </p>
                    <div className="text-sm font-semibold lg:text-base">
                      {deadline ? formatProgramDate(deadline, language) : copy.noDate}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {getTrackerDateHint(status, relevantWindow?.deadline, nextOpenDate, language, t, now)}
                    </div>
                  </div>

                  <div className="rounded-md border border-border bg-background p-3 lg:border-0 lg:bg-transparent lg:p-0">
                    <p className="mb-1 text-xs font-medium text-muted-foreground lg:hidden">
                      GRE
                    </p>
                    <Badge variant={getGreTone(program.gre)}>{getGreLabel(program.gre, language)}</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-[40px_minmax(0,1fr)_minmax(0,1fr)] gap-2 lg:flex lg:flex-wrap lg:justify-end">
                  <FavoriteButton programId={program.id} compact />
                  <Button asChild size="sm" variant="outline" className="min-w-0">
                    <Link href={`/program/${program.id}`}>{t.viewDetails}</Link>
                  </Button>
                  <Button asChild size="sm" className="min-w-0">
                    <a href={program.links.apply} target="_blank" rel="noreferrer">
                      {copy.officialApply}
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <PaginationControls
        page={currentPage}
        totalPages={totalPages}
        onPageChange={setPage}
      />
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
    <article className="mb-4 break-inside-avoid rounded-lg border border-border bg-card p-4 shadow-soft">
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

      <div className="grid gap-3">
        {group.programs.map((program) => (
          <ProgramRow key={program.id} program={program} now={now} />
        ))}
      </div>
    </article>
  );
}
function ProgramRow({ program, now }: { program: Program; now: Date }) {
  const { language, t } = useLanguage();
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

function getProgramMajor(program: Program): MajorFilter {
  const name = program.program.toLowerCase();

  if (name.includes("mba")) {
    return "MBA";
  }

  if (name.includes("software engineering")) {
    return "Software Engineering";
  }

  if (name.includes("data science")) {
    return "Data Science";
  }

  if (
    name.includes("electrical engineering") ||
    name.includes("computer engineering") ||
    name.includes("engineering science")
  ) {
    return "Electrical / Computer Engineering";
  }

  if (name.includes("analytics") || name.includes("statistics")) {
    return "Analytics / Statistics";
  }

  if (name.includes("information") || name.includes("informatics")) {
    return "Information";
  }

  return "Computer Science";
}

function getMajorFilterLabel(major: MajorFilter, language: Language) {
  if (language === "en") {
    return major;
  }

  const labels: Record<MajorFilter, string> = {
    All: "全部",
    "Computer Science": "计算机科学",
    "Data Science": "数据科学",
    Information: "信息 / Informatics",
    "Analytics / Statistics": "分析 / 统计",
    "Software Engineering": "软件工程",
    "Electrical / Computer Engineering": "电子与计算机工程",
    MBA: "MBA"
  };

  return labels[major];
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

function compareTrackerPrograms(left: Program, right: Program, now: Date) {
  const leftStatus = getProgramStatus(left, now);
  const rightStatus = getProgramStatus(right, now);
  const statusComparison = getTrackerStatusRank(leftStatus) - getTrackerStatusRank(rightStatus);

  if (statusComparison !== 0) {
    return statusComparison;
  }

  const leftDate = leftStatus === "Not Open"
    ? getNextApplicationOpenDate(left, now)
    : getRelevantApplicationWindow(left, now)?.deadline;
  const rightDate = rightStatus === "Not Open"
    ? getNextApplicationOpenDate(right, now)
    : getRelevantApplicationWindow(right, now)?.deadline;

  return compareByDateThenName(leftDate, rightDate, left, right);
}

function getTrackerStatusRank(status: ReturnType<typeof getProgramStatus>) {
  if (status === "Open") {
    return 0;
  }

  if (status === "Not Open") {
    return 1;
  }

  return 2;
}

function getTrackerDateHint(
  status: ReturnType<typeof getProgramStatus>,
  deadline: string | undefined,
  nextOpenDate: string | null,
  language: Language,
  t: ReturnType<typeof useLanguage>["t"],
  now: Date
) {
  if (status === "Open" && deadline) {
    return formatDeadlineCountdown(deadline, t, now);
  }

  if (status === "Not Open" && nextOpenDate) {
    return t.opensOn(formatProgramDate(nextOpenDate, language));
  }

  if (status === "Closed") {
    return t.deadlinePassed;
  }

  return "-";
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
