"use client";

import Link from "next/link";
import { BookOpenCheck, ExternalLink, GraduationCap, SearchCheck } from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const copy = {
  zh: {
    badge: "关于 AdmitFlow",
    title: "一个个人维护、方便国内同学查询美国大学申请信息的双语导航工具。",
    intro:
      "AdmitFlow 是我个人为了方便国内同学做初步选校和申请信息查询而维护的网站。它不是学校官网，也不代表任何大学或机构；它只是把申请者最常比较的信息放在同一个清晰界面里：项目名称、学位层级、申请窗口、截止日期、考试要求、常见材料、学校概况和官方入口。",
    missionTitle: "为什么做这个站",
    mission:
      "美国大学申请信息分散在学院、研究生院、国际学生办公室和统一申请系统之间。很多国内同学第一次申请时，需要打开多个英文页面才能确认一个项目是否开放申请、是否需要 GRE、TOEFL 要求在哪里说明、以及真正的申请入口是哪一个。我把这些入口整理成可搜索、可保存、可对比的目录，减少重复查找时间。",
    valueTitle: "本站提供的原创价值",
    values: [
      "把项目申请窗口转换成可比较的时间线，并根据当前日期显示开放、未开放或已截止状态。",
      "为每个项目保留官方项目页、录取页、国际学生页和申请入口，减少用户在搜索结果中误点非官方页面的风险。",
      "用同一套字段整理本科、硕士和博士样例项目，方便申请者按州、学位类型和 GRE 要求筛选。",
      "把学校概况、录取率来源、CWUR 2026 排名和项目覆盖范围放在一起，帮助用户理解数据口径。"
    ],
    scopeTitle: "覆盖范围",
    scope:
      "当前目录覆盖 158 个项目和 68 所学校，重点是常见申请方向和能公开验证申请信息的学校。目录会继续扩展，但不会收录无法找到可靠来源或申请入口不清晰的项目。",
    audienceTitle: "适合谁使用",
    audience:
      "本站主要适合正在做初步选校、比较截止日期、保存候选项目、或需要快速跳转到学校官方申请页面的国内同学。最终申请决策仍应以学校官方页面和个人实际情况为准。",
    cta: "查看数据方法",
    source: "浏览项目库",
    officialNote: "AdmitFlow 会在用户采取申请行动前，把用户带回学校官方页面。"
  },
  en: {
    badge: "About AdmitFlow",
    title: "A personally maintained bilingual navigator for Chinese students researching US university applications.",
    intro:
      "AdmitFlow is a personal website I maintain to help students in China do early-stage US university research more efficiently. It does not replace official school websites and does not represent any university or organization. It puts the details applicants compare most often into one readable interface: program name, degree level, application window, deadline, testing requirements, common materials, school context, and official links.",
    missionTitle: "Why This Site Exists",
    mission:
      "US application information is often spread across department pages, graduate schools, international offices, and central application systems. Many Chinese students need several English pages just to confirm whether a program is open, whether GRE is required, where TOEFL policy is explained, and which link is the real application entry point. I organize those sources into a searchable, saveable, comparable catalog to reduce repeated lookup work.",
    valueTitle: "Original Value Provided Here",
    values: [
      "Application windows are normalized into comparable timelines with open, not open, or closed status based on the current date.",
      "Each program keeps official program, admission, international student, and application links to reduce accidental clicks to unofficial pages.",
      "Undergraduate, master's, and doctoral sample programs use the same fields so users can filter by state, degree group, and GRE policy.",
      "School context, admission-rate source notes, CWUR 2026 ranking data, and catalog coverage are shown together so users can understand the data scope."
    ],
    scopeTitle: "Coverage",
    scope:
      "The current catalog covers 158 programs and 68 schools, focused on common application paths and schools with publicly verifiable admissions information. The catalog will expand, but programs without reliable sources or clear application links are not included.",
    audienceTitle: "Who It Helps",
    audience:
      "The site is mainly for Chinese students who are shortlisting schools, comparing deadlines, saving candidate programs, or jumping quickly to official application pages. Final application decisions should always be based on official school pages and each student's own situation.",
    cta: "View Methodology",
    source: "Browse Programs",
    officialNote: "AdmitFlow links users back to official school pages before any application action."
  }
} as const;

export default function AboutPage() {
  const { language } = useLanguage();
  const text = copy[language];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-10">
        <Badge variant="secondary" className="mb-4">
          <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
          {text.badge}
        </Badge>
        <h1 className="max-w-4xl text-4xl font-semibold tracking-normal sm:text-5xl">
          {text.title}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground">
          {text.intro}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/methodology">
              {text.cta}
              <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">
              {text.source}
              <SearchCheck className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-8">
        <ContentBlock title={text.missionTitle} body={text.mission} />
        <section>
          <h2 className="text-2xl font-semibold">{text.valueTitle}</h2>
          <ul className="mt-4 grid gap-3">
            {text.values.map((value) => (
              <li key={value} className="rounded-lg border border-border bg-card p-4 text-sm leading-7">
                {value}
              </li>
            ))}
          </ul>
        </section>
        <ContentBlock title={text.scopeTitle} body={text.scope} />
        <ContentBlock title={text.audienceTitle} body={text.audience} />
        <p className="text-sm leading-6 text-muted-foreground">
          <ExternalLink className="mr-2 inline h-4 w-4" aria-hidden="true" />
          {text.officialNote}
        </p>
      </section>
    </main>
  );
}

function ContentBlock({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-3 text-base leading-8 text-muted-foreground">{body}</p>
    </section>
  );
}
