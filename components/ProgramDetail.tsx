"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
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
  type Program
} from "@/lib/programs";
import { getSchoolProfile, type SchoolProfile } from "@/lib/schools";

type ProgramDetailProps = {
  program: Program;
};

const detailCopy = {
  zh: {
    applicationProcess: "申请流程",
    processNote: "流程按本项目的官方申请入口生成；不同学期或身份的特殊要求请以学校页面为准。"
  },
  en: {
    applicationProcess: "Application Process",
    processNote:
      "This flow is generated from the official application links for this program. Confirm term- or applicant-specific requirements on the school pages."
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
  const applicationProcess = getApplicationProcess(program, language);
  const localCopy = detailCopy[language];
  const officialLinks = [
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
  ];

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
          <h1 className="max-w-4xl text-4xl font-semibold tracking-normal sm:text-5xl">
            {program.program}
          </h1>
        </div>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">{t.saveThisProgram}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <FavoriteButton programId={program.id} className="w-full" />
            <Button asChild className="w-full">
              <a href={program.links.apply} target="_blank" rel="noreferrer">
                {t.applyNow}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
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
                    <Button asChild variant="outline" size="sm" className="justify-between">
                      <a href={step.href} target="_blank" rel="noreferrer">
                        {step.linkLabel}
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </a>
                    </Button>
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

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t.officialLinks}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {officialLinks.map(({ label, href, icon: Icon }) => (
              <Button key={label} asChild variant="outline" className="justify-between">
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
      </section>
    </main>
  );
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
