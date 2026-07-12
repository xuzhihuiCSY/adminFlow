"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  ExternalLink,
  Flag,
  FileText,
  Globe2,
  GraduationCap,
  Languages,
  MailCheck,
  UploadCloud,
  UserPlus,
  WalletCards
} from "lucide-react";

import FavoriteButton from "@/components/FavoriteButton";
import { useLanguage } from "@/components/LanguageProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatLastVerified } from "@/lib/catalog-meta";
import { useCurrentDate } from "@/components/useCurrentDate";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  formatProgramDate,
  getAvailabilityLabel,
  getGreLabel,
  getGreValueLabel,
  getLevelLabel,
  getMaterialLabel,
  getStateLabel,
  getToeflLabel
} from "@/lib/i18n";
import { getApplicationProcess } from "@/lib/application-process";
import {
  getAvailabilityTone,
  getDaysUntilDeadline,
  getGreTone,
  getNextApplicationOpenDate,
  getProgramStatus,
  getRelevantApplicationWindow,
  getWindowSchedule,
  programs,
  type Program
} from "@/lib/programs";
import { getSchoolMotto, getSchoolProfile, type SchoolProfile } from "@/lib/schools";

type ProgramDetailProps = {
  program: Program;
};

const detailCopy = {
  zh: {
  applicationProcess: "申请流程",
    processNote: "流程按本项目的官方申请入口生成；不同学期或身份的特殊要求请以学校页面为准。",
    actionTitle: "申请行动",
    currentStatus: "当前状态",
    keyDate: "关键日期",
    lastVerified: "最后核验",
    sourceLabel: "来源",
    sourceValue: "官方项目页 / 官方录取页",
    officialReminder: "提交申请前请以学校官网为准。",
    reportIssue: "报告信息错误",
    similarPrograms: "相似项目",
    viewProgram: "查看项目",
    costAndAid: "费用与统计",
    tuitionOutOfState: "州外学费",
    tuitionInState: "州内学费",
    internationalStudentRate: "国际学生比例",
    averageGrantAid: "平均资助金额（估算）",
    undergraduateSize: "本科生规模",
    meanEarnings10Years: "平均薪资（入学后10年）",
    completionRate: "毕业率",
    retentionRate: "新生保留率",
    scorecardSource: "IPEDS / College Scorecard",
    scorecardDisclaimer:
      "以上为美国教育部 College Scorecard / IPEDS 公开统计口径，通常是学校层级数据，不一定等同于具体项目、国际学生或当前学年的实际账单。国际学生比例使用本科生 non-resident alien 统计口径；平均资助金额为年度就读成本减去平均净价的估算口径，主要反映获得联邦资助学生群体的 grant/scholarship aid；平均薪资为入学后 10 年、工作且未继续就读人群的统计。学费、杂费、奖学金和生活费请以学校官网最新信息为准。",
    scholarshipTitle: "奖学金与资助入口",
    scholarshipNote: "奖学金资格、金额和国际学生适用范围请以学校官网为准。",
    educationUsaAid: "EducationUSA 奖学金/资助库",
    schoolAidEntry: "学校官网录取/资助信息",
    internationalAidEntry: "国际学生资助信息",
    mottoSource: "校训来源",
    unofficialMotto: "非官方校训"
  },
  en: {
    applicationProcess: "Application Process",
    processNote:
      "This flow is generated from the official application links for this program. Confirm term- or applicant-specific requirements on the school pages.",
    actionTitle: "Application Action",
    currentStatus: "Current status",
    keyDate: "Key date",
    lastVerified: "Last verified",
    sourceLabel: "Source",
    sourceValue: "Official program / admissions pages",
    officialReminder: "Confirm with the school website before applying.",
    reportIssue: "Report issue",
    similarPrograms: "Similar programs",
    viewProgram: "View program",
    costAndAid: "Cost and aid stats",
    tuitionOutOfState: "Out-of-state tuition",
    tuitionInState: "In-state tuition",
    internationalStudentRate: "International student rate",
    averageGrantAid: "Average aid amount (estimated)",
    undergraduateSize: "Undergraduate size",
    meanEarnings10Years: "Mean earnings (10 years after entry)",
    completionRate: "Completion rate",
    retentionRate: "First-year retention",
    scorecardSource: "IPEDS / College Scorecard",
    scorecardDisclaimer:
      "These figures use public U.S. Department of Education College Scorecard / IPEDS reporting and are generally school-level statistics. They may not equal the actual bill for a specific program, international student, or current academic year. International student rate uses the undergraduate non-resident alien reporting category; average aid amount is estimated as cost of attendance minus average net price, mainly reflecting grant/scholarship aid for students receiving federal aid; mean earnings are measured 10 years after entry among students who are working and not enrolled. Confirm tuition, fees, scholarships, and living costs on the school website.",
    scholarshipTitle: "Scholarship and aid links",
    scholarshipNote: "Scholarship eligibility, amount, and international-student availability must be confirmed on the school website.",
    educationUsaAid: "EducationUSA financial aid search",
    schoolAidEntry: "School official admission/aid page",
    internationalAidEntry: "International student aid info",
    mottoSource: "Motto source",
    unofficialMotto: "Unofficial motto"
  }
} as const;

const processIcons = [UserPlus, ClipboardList, UploadCloud, Globe2, WalletCards, MailCheck];

function formatDaysUntil(deadline: string, t: ReturnType<typeof useLanguage>["t"], now: Date) {
  const days = getDaysUntilDeadline(deadline, now);

  if (days < 0) {
    return t.deadlinePassed;
  }

  if (days === 0) {
    return t.dueToday;
  }

  return t.daysUntilDeadline(days);
}

export default function ProgramDetail({ program }: ProgramDetailProps) {
  const { language, t } = useLanguage();
  const now = useCurrentDate();
  const status = getProgramStatus(program, now);
  const isOpen = status === "Open";
  const isNotOpen = status === "Not Open";
  const nextOpenDate = getNextApplicationOpenDate(program, now);
  const relevantWindow = getRelevantApplicationWindow(program, now);
  const schoolProfile = getSchoolProfile(program.school);
  const schoolMotto = getSchoolMotto(program.school);
  const applicationProcess = markFirstUniqueProcessLinks(getApplicationProcess(program, language));
  const localCopy = detailCopy[language];
  const similarPrograms = getSimilarPrograms(program);
  const officialLinks = getUniqueOfficialLinks([
    {
      label: t.programWebsite,
      href: program.links.program,
      icon: GraduationCap
    },
    {
      label: t.admissionPage,
      href: program.links.admission,
      icon: FileText
    },
    {
      label: t.internationalStudentPage,
      href: program.links.international,
      icon: Globe2
    },
    {
      label: t.applyNow,
      href: program.links.apply,
      icon: ExternalLink
    }
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" className="mb-6 -ml-3">
        <Link href="/">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t.backToPrograms}
        </Link>
      </Button>

      <section className="mb-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge variant="muted">{getLevelLabel(program.level, language)}</Badge>
            <Badge variant="secondary">{program.degree}</Badge>
            <Badge variant={getAvailabilityTone(status)}>
              {getAvailabilityLabel(status, language)}
            </Badge>
            <Badge variant={getGreTone(program.gre)}>{getGreLabel(program.gre, language)}</Badge>
            <Badge variant="outline">{getStateLabel(program.state, language)}</Badge>
          </div>
          <p className="mb-2 text-base font-medium text-muted-foreground">{program.school}</p>
          {schoolMotto ? (
            <p className="mb-3 max-w-3xl text-sm italic leading-6 text-muted-foreground">
              <span>{schoolMotto.original}</span>
              <span aria-hidden="true"> · </span>
              <span>{schoolMotto[language]}</span>
              {schoolMotto.unofficial ? (
                <span className="ml-2 not-italic">({localCopy.unofficialMotto})</span>
              ) : null}
              <a
                href={schoolMotto.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-2 inline-flex not-italic text-primary underline-offset-4 hover:underline"
                aria-label={`${program.school} ${localCopy.mottoSource}`}
                title={localCopy.mottoSource}
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </p>
          ) : null}
          <h1 className="max-w-4xl text-4xl font-semibold tracking-normal sm:text-5xl">
            {program.program}
          </h1>
          <OfficialLinksPanel links={officialLinks} title={t.officialLinks} />
        </div>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">{localCopy.actionTitle}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-2 rounded-md border border-border p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{localCopy.currentStatus}</span>
                <Badge variant={getAvailabilityTone(status)}>
                  {getAvailabilityLabel(status, language)}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{localCopy.keyDate}</span>
                <span className="font-medium">
                  {relevantWindow
                    ? formatProgramDate(
                        isNotOpen && nextOpenDate ? nextOpenDate : relevantWindow.deadline,
                        language
                      )
                    : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{localCopy.lastVerified}</span>
                <span className="font-medium">{formatLastVerified(language)}</span>
              </div>
            </div>
            <FavoriteButton programId={program.id} className="w-full" />
            <Button asChild className="w-full">
              <a href={program.links.apply} target="_blank" rel="noreferrer">
                {t.applyNow}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/contact?program=${program.id}`}>
                <Flag className="h-4 w-4" aria-hidden="true" />
                {localCopy.reportIssue}
              </Link>
            </Button>
            <div className="rounded-md bg-muted p-3 text-xs leading-5 text-muted-foreground">
              <p>
                {localCopy.sourceLabel}: {localCopy.sourceValue}
              </p>
              <p className="mt-1">{localCopy.officialReminder}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              {isNotOpen ? t.applicationOpens : t.applicationDeadline}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {isNotOpen && nextOpenDate
                ? formatProgramDate(nextOpenDate, language, true)
                : relevantWindow
                  ? formatProgramDate(relevantWindow.deadline, language, true)
                  : getAvailabilityLabel(status, language)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isOpen
                ? relevantWindow
                  ? formatDaysUntil(relevantWindow.deadline, t, now)
                  : t.deadlinePassed
                : isNotOpen
                  ? `${t.applicationDeadline}: ${
                      relevantWindow
                        ? formatProgramDate(relevantWindow.deadline, language, true)
                        : "-"
                    }`
                  : t.deadlinePassed}
            </p>
            <p className="mt-3 text-xs font-medium text-muted-foreground">
              {t.cycle}: {relevantWindow?.intake ?? "-"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" aria-hidden="true" />
              {t.greRequirement}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{getGreValueLabel(program.gre, language)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t.testingPolicyNote}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Languages className="h-4 w-4" aria-hidden="true" />
              {t.toeflRequirement}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{getToeflLabel(program.toefl, language)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t.toeflPolicyNote}</p>
            {isOpen && relevantWindow?.opens ? (
              <p className="mt-3 text-xs font-medium text-muted-foreground">
                {t.opensOn(formatProgramDate(relevantWindow.opens, language))}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              {t.applicationWindows}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {getWindowSchedule(program, now).map((window) => (
              <div
                key={`${window.intake}-${window.opens}-${window.deadline}`}
                className="rounded-md border border-border p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{window.intake}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {window.opens
                    ? t.opensOn(formatProgramDate(window.opens, language))
                    : t.open}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.applicationDeadline}: {formatProgramDate(window.deadline, language)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {localCopy.applicationProcess}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-3 md:grid-cols-2">
              {applicationProcess.map((step, index) => {
                const Icon = processIcons[index] ?? CheckCircle2;

                return (
                  <li
                    key={step.title}
                    className="grid gap-3 rounded-md border border-border p-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-medium">
                          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          {step.title}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </div>
                    {step.showLink ? (
                      <Button asChild variant="outline" size="sm" className="justify-between">
                        <a href={step.href} target="_blank" rel="noreferrer">
                          {step.linkLabel}
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        </a>
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ol>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              {localCopy.processNote}
            </p>
          </CardContent>
        </Card>

        <SchoolOverviewCard profile={schoolProfile} />

        <CostAndAidCard profile={schoolProfile} />

        <Card>
          <CardHeader>
            <CardTitle>{t.applicationMaterials}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3">
              {program.materials.map((material) => (
                <li key={material} className="flex items-center gap-3 text-sm">
                  <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                  {getMaterialLabel(material, language)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <ScholarshipLinksCard program={program} />

        {similarPrograms.length > 0 ? (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{localCopy.similarPrograms}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {similarPrograms.map((item) => (
                <Link
                  key={item.id}
                  className="rounded-md border border-border p-3 transition hover:bg-accent"
                  href={`/program/${item.id}`}
                >
                  <p className="text-sm font-semibold leading-5">{item.school}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.program}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="muted">{item.degree}</Badge>
                    <Badge variant={getAvailabilityTone(getProgramStatus(item, now))}>
                      {getAvailabilityLabel(getProgramStatus(item, now), language)}
                    </Badge>
                  </div>
                  <p className="mt-3 text-xs font-medium text-foreground">
                    {localCopy.viewProgram}
                  </p>
                </Link>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </section>
    </main>
  );
}

function getSimilarPrograms(program: Program) {
  return programs
    .filter(
      (item) =>
        item.id !== program.id &&
        (item.degree === program.degree ||
          item.level === program.level ||
          item.program.toLowerCase().includes(program.program.split(" ")[0].toLowerCase()))
    )
    .slice(0, 3);
}

type ProcessStepWithLinkVisibility = ReturnType<typeof getApplicationProcess>[number] & {
  showLink: boolean;
};

function markFirstUniqueProcessLinks(
  steps: ReturnType<typeof getApplicationProcess>
): ProcessStepWithLinkVisibility[] {
  const seen = new Set<string>();

  return steps.map((step) => {
    const key = normalizeExternalHref(step.href);
    const showLink = !seen.has(key);

    seen.add(key);

    return {
      ...step,
      showLink
    };
  });
}

type OfficialLink = {
  label: string;
  href: string;
  icon: typeof GraduationCap;
};

function getUniqueOfficialLinks(links: OfficialLink[]) {
  const seen = new Set<string>();

  return links.filter((link) => {
    const key = normalizeExternalHref(link.href);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function OfficialLinksPanel({
  links,
  title
}: {
  links: OfficialLink[];
  title: string;
}) {
  return (
    <section className="mt-8 max-w-4xl rounded-lg border border-border bg-card p-4 shadow-soft">
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{title}</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {links.map(({ label, href, icon: Icon }) => (
          <Button key={`${label}-${href}`} asChild variant="outline" className="justify-between">
            <a href={href} target="_blank" rel="noreferrer">
              <span className="inline-flex min-w-0 items-center gap-2">
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{label}</span>
              </span>
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
            </a>
          </Button>
        ))}
      </div>
    </section>
  );
}

function normalizeExternalHref(href: string) {
  try {
    const url = new URL(href);
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();

    if (url.pathname !== "/") {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }

    return url.toString();
  } catch {
    return href.trim().replace(/\/+$/, "");
  }
}

function SchoolOverviewCard({ profile }: { profile: SchoolProfile | null }) {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-4 w-4" aria-hidden="true" />
          {t.schoolOverview}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {profile ? (
          <>
            <ProfileRow
              label={t.schoolType}
              value={profile.schoolType === "Public" ? t.publicSchool : t.privateSchool}
            />
            <ProfileRow label={t.city} value={profile.city} />
            <ProfileRow
              label={t.acceptanceRate}
              value={profile.acceptanceRate ?? t.noReliableData}
            />
            <ProfileRow label={t.acceptanceRateScope} value={profile.acceptanceRateScope} />
            <ProfileRow label={t.sourceType} value={getSourceTypeLabel(profile.sourceType, t)} />
            <ProfileRow label={t.lastUpdated} value={profile.updated} />
            <Button asChild variant="outline" className="justify-between">
              <a href={profile.sourceUrl} target="_blank" rel="noreferrer">
                <span>{profile.sourceLabel}</span>
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t.noReliableData}</p>
        )}
      </CardContent>
    </Card>
  );
}

function CostAndAidCard({ profile }: { profile: SchoolProfile | null }) {
  const { language, t } = useLanguage();
  const copy = detailCopy[language];
  const scorecard = profile?.scorecard;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" aria-hidden="true" />
          {copy.costAndAid}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {scorecard ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <ProfileRow
                label={copy.tuitionOutOfState}
                value={formatCurrency(scorecard.tuitionOutOfState, language, t.noReliableData)}
              />
              <ProfileRow
                label={copy.tuitionInState}
                value={formatCurrency(scorecard.tuitionInState, language, t.noReliableData)}
              />
              <ProfileRow
                label={copy.internationalStudentRate}
                value={formatPercentValue(scorecard.internationalStudentRate, t.noReliableData)}
              />
              <ProfileRow
                label={copy.averageGrantAid}
                value={formatCurrency(scorecard.averageGrantAid, language, t.noReliableData)}
              />
              <ProfileRow
                label={copy.undergraduateSize}
                value={formatNumber(scorecard.undergraduateSize, language, t.noReliableData)}
              />
              <ProfileRow
                label={copy.meanEarnings10Years}
                value={formatCurrency(scorecard.meanEarnings10Years, language, t.noReliableData)}
              />
              <ProfileRow
                label={copy.completionRate}
                value={formatPercentValue(scorecard.completionRate, t.noReliableData)}
              />
              <ProfileRow
                label={copy.retentionRate}
                value={formatPercentValue(scorecard.retentionRate, t.noReliableData)}
              />
            </div>
            <Button asChild variant="outline" className="justify-between">
              <a href={scorecard.sourceUrl} target="_blank" rel="noreferrer">
                <span>{copy.scorecardSource}</span>
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
            <p className="text-xs leading-5 text-muted-foreground">
              {scorecard.sourceLabel} · {scorecard.updated}
            </p>
            <p className="rounded-md bg-muted p-3 text-xs leading-5 text-muted-foreground">
              {copy.scorecardDisclaimer}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t.noReliableData}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ScholarshipLinksCard({ program }: { program: Program }) {
  const { language } = useLanguage();
  const copy = detailCopy[language];
  const links = getUniqueOfficialLinks([
    {
      label: copy.educationUsaAid,
      href: "https://educationusa.state.gov/find-financial-aid",
      icon: WalletCards
    },
    {
      label: copy.schoolAidEntry,
      href: program.links.admission,
      icon: FileText
    },
    {
      label: copy.internationalAidEntry,
      href: program.links.international,
      icon: Globe2
    }
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" aria-hidden="true" />
          {copy.scholarshipTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-sm leading-6 text-muted-foreground">{copy.scholarshipNote}</p>
        {links.map(({ label, href, icon: Icon }) => (
          <Button key={`${label}-${href}`} asChild variant="outline" className="justify-between">
            <a href={href} target="_blank" rel="noreferrer">
              <span className="inline-flex items-center gap-2">
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </span>
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function getSourceTypeLabel(
  sourceType: SchoolProfile["sourceType"],
  t: ReturnType<typeof useLanguage>["t"]
) {
  if (sourceType === "government-third-party") {
    return t.governmentThirdPartySource;
  }

  if (sourceType === "third-party") {
    return t.thirdPartySource;
  }

  return t.officialSource;
}

function formatCurrency(value: number | null, language: "zh" | "en", fallback: string) {
  if (value === null) {
    return fallback;
  }

  return new Intl.NumberFormat(language === "zh" ? "zh-CN" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function formatNumber(value: number | null, language: "zh" | "en", fallback: string) {
  if (value === null) {
    return fallback;
  }

  return new Intl.NumberFormat(language === "zh" ? "zh-CN" : "en-US").format(value);
}

function formatPercentValue(value: number | null, fallback: string) {
  return value === null ? fallback : `${value}%`;
}
