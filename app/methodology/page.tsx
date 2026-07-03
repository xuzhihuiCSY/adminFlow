"use client";

import Link from "next/link";
import { CalendarClock, Database, ExternalLink, ShieldCheck } from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const copy = {
  zh: {
    badge: "数据方法",
    title: "我们如何整理申请项目、截止日期和来源。",
    intro:
      "AdmitFlow 使用人工整理的数据结构，而不是从搜索结果中批量复制页面文本。每条项目记录都围绕申请者需要确认的几个核心问题建立：它是什么项目、什么时候申请、需要哪些常见材料、考试政策是什么、官方链接在哪里。",
    sections: [
      {
        title: "收录标准",
        icon: Database,
        body:
          "项目必须能找到公开可访问的官方项目页或录取页，并且申请入口、国际学生要求或统一申请系统入口至少有一个可验证来源。缺少清晰官方来源的项目不会加入目录。"
      },
      {
        title: "字段标准化",
        icon: CalendarClock,
        body:
          "申请窗口被拆分为开放日期、截止日期和入学季。系统会根据当前日期计算开放状态，避免只展示静态文字。GRE、TOEFL 和材料要求使用统一字段，便于筛选和比较。"
      },
      {
        title: "来源和更新",
        icon: ShieldCheck,
        body:
          "学校概况优先使用官方页面；当官方页面没有稳定公开数据时，会使用美国教育部 College Scorecard 等可靠外部来源并标注来源类型。排名页使用 CWUR 2026 Global 2000，并在页面上显示来源和更新时间。"
      },
      {
        title: "限制说明",
        icon: ExternalLink,
        body:
          "大学会在申请季中更新政策。本站适合做初步筛选和导航，不应作为最终申请依据。每个详情页都保留官方链接，用户提交申请前应在学校页面再次确认截止日期、费用、考试政策和材料要求。"
      }
    ],
    checksTitle: "质量检查",
    checks: [
      "避免复制学校页面的大段正文，只保留必要事实字段和本站自己的整理说明。",
      "把重复字段做成结构化数据，减少同一段内容在多个页面反复出现。",
      "优先链接到官方来源，外部统计来源明确标注数据口径。",
      "定期运行链接检查，移除失效、跳转异常或与项目无关的链接。"
    ],
    cta: "查看学校排行",
    contact: "报告数据问题"
  },
  en: {
    badge: "Data Methodology",
    title: "How application programs, deadlines, and sources are organized.",
    intro:
      "AdmitFlow uses a manually organized data structure rather than bulk-copying text from search results. Each program record is built around the questions applicants need to answer: what the program is, when to apply, which common materials are expected, what the testing policy says, and where the official links are.",
    sections: [
      {
        title: "Inclusion Criteria",
        icon: Database,
        body:
          "A program needs a publicly accessible official program or admission page. At least one verifiable source must identify the application entry point, international applicant requirements, or central application system. Programs without clear official sources are not added."
      },
      {
        title: "Field Normalization",
        icon: CalendarClock,
        body:
          "Application windows are split into opening date, deadline, and intake. The site calculates the current status from today's date instead of showing only static text. GRE, TOEFL, and material requirements use shared fields so they can be filtered and compared."
      },
      {
        title: "Sources and Updates",
        icon: ShieldCheck,
        body:
          "School profiles prefer official pages. When official pages do not publish stable public data, reliable external sources such as the U.S. Department of Education College Scorecard are labeled by source type. The rankings page uses CWUR 2026 Global 2000 and displays source and update notes."
      },
      {
        title: "Limitations",
        icon: ExternalLink,
        body:
          "Universities can update policies during an application cycle. This site is for first-pass comparison and navigation, not a final application authority. Each detail page keeps official links so users can reconfirm deadlines, fees, testing policy, and materials before submitting."
      }
    ],
    checksTitle: "Quality Checks",
    checks: [
      "Avoid copying long passages from school pages; keep necessary factual fields and original organizing notes.",
      "Store repeated facts as structured data so the same text is not repeated across many pages.",
      "Prioritize official sources and label the scope of external statistics.",
      "Run link checks regularly and remove links that are broken, misleading, or unrelated to the program."
    ],
    cta: "View Rankings",
    contact: "Report a Data Issue"
  }
} as const;

export default function MethodologyPage() {
  const { language } = useLanguage();
  const text = copy[language];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-10">
        <Badge variant="secondary" className="mb-4">
          {text.badge}
        </Badge>
        <h1 className="max-w-4xl text-4xl font-semibold tracking-normal sm:text-5xl">
          {text.title}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground">
          {text.intro}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {text.sections.map(({ title, body, icon: Icon }) => (
          <article key={title} className="rounded-lg border border-border bg-card p-5 shadow-soft">
            <Icon className="mb-4 h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{body}</p>
          </article>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">{text.checksTitle}</h2>
        <ul className="mt-4 grid gap-3">
          {text.checks.map((check) => (
            <li key={check} className="rounded-md border border-border bg-background p-4 text-sm leading-7">
              {check}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/rankings">{text.cta}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/contact">{text.contact}</Link>
        </Button>
      </div>
    </main>
  );
}
