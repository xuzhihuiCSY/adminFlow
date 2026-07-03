"use client";

import { Mail, ShieldQuestion } from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import { Badge } from "@/components/ui/badge";

const contactEmail = "xuzhihuieateat@gmail.com";

const copy = {
  zh: {
    badge: "联系",
    title: "报告数据问题、失效链接或隐私请求。",
    intro:
      "如果某个项目的申请截止日期、考试要求、官方链接或学校数据不准确，请发送具体页面 URL 和你看到的官方来源。我们会优先处理影响申请决策的信息。",
    emailLabel: "邮箱",
    whatToSend: "建议提供",
    items: [
      "AdmitFlow 页面链接或项目名称",
      "你认为需要修改的字段",
      "学校官方页面或可靠来源链接",
      "如果是隐私或广告相关问题，请说明发生时间、页面和设备环境"
    ],
    note:
      "AdmitFlow 仅代表我个人维护，不代表任何大学、机构或官方招生部门，也不提供录取保证、签证建议或付费申请代写服务。"
  },
  en: {
    badge: "Contact",
    title: "Report data issues, broken links, or privacy requests.",
    intro:
      "If an application deadline, testing requirement, official link, or school data point appears inaccurate, send the page URL and the official source you found. We prioritize information that affects application decisions.",
    emailLabel: "Email",
    whatToSend: "Helpful Details",
    items: [
      "The AdmitFlow page link or program name",
      "The field you believe should be changed",
      "The official school page or reliable source link",
      "For privacy or advertising issues, include the time, page, and device context"
    ],
    note:
      "AdmitFlow is maintained by me personally. It does not represent any university, organization, or official admissions office, and it does not provide admission guarantees, visa advice, or paid application-writing services."
  }
} as const;

export default function ContactPage() {
  const { language } = useLanguage();
  const text = copy[language];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Badge variant="secondary" className="mb-4">
        <ShieldQuestion className="h-3.5 w-3.5" aria-hidden="true" />
        {text.badge}
      </Badge>
      <h1 className="max-w-3xl text-4xl font-semibold tracking-normal sm:text-5xl">
        {text.title}
      </h1>
      <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground">
        {text.intro}
      </p>

      <section className="mt-8 rounded-lg border border-border bg-card p-5 shadow-soft">
        <h2 className="text-lg font-semibold">{text.emailLabel}</h2>
        <a
          href={`mailto:${contactEmail}`}
          className="mt-3 inline-flex items-center gap-2 text-base font-medium text-primary underline-offset-4 hover:underline"
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
          {contactEmail}
        </a>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold">{text.whatToSend}</h2>
        <ul className="mt-4 grid gap-3">
          {text.items.map((item) => (
            <li key={item} className="rounded-md border border-border bg-background p-4 text-sm leading-7">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8 text-sm leading-7 text-muted-foreground">{text.note}</p>
    </main>
  );
}
