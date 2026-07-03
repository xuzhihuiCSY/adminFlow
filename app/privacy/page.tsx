"use client";

import Link from "next/link";

import { useLanguage } from "@/components/LanguageProvider";
import { Badge } from "@/components/ui/badge";

const copy = {
  zh: {
    badge: "隐私政策",
    title: "AdmitFlow 隐私政策",
    updated: "最后更新：2026 年 6 月 24 日",
    intro:
      "我们尽量让这个站点保持简单。用户无需创建账号即可搜索项目、查看学校信息和保存清单。保存功能使用浏览器本地存储，不会把你的清单上传到 AdmitFlow 服务器。",
    sections: [
      {
        title: "我们收集的信息",
        body:
          "当你访问网站时，服务器和托管服务可能记录常见技术信息，例如 IP 地址、浏览器类型、访问时间、访问页面和错误日志。站点本身不要求用户提交姓名、电话、学校账号或申请材料。"
      },
      {
        title: "本地保存的清单",
        body:
          "“我的清单”保存在你的浏览器 localStorage 中，用于记录你主动收藏的项目 ID。清除浏览器数据或更换设备会移除这些本地记录。"
      },
      {
        title: "广告和 Cookie",
        body:
          "如果网站启用 Google AdSense，Google 和其合作方可能使用 Cookie、网络信标、IP 地址或其他标识符来投放广告、限制广告频次、衡量效果或防止欺诈。你可以查看 Google 关于合作伙伴网站数据使用方式的说明。"
      },
      {
        title: "外部链接",
        body:
          "项目详情页会链接到大学、申请系统、排名来源和其他外部网站。外部网站有自己的隐私政策和内容政策；离开 AdmitFlow 后，请以对应网站的政策为准。"
      },
      {
        title: "联系我们",
        body:
          "如果你发现隐私问题、错误链接或希望我们删除某项非必要信息，请通过联系页面发送说明。"
      }
    ],
    googleLink: "Google 如何使用来自合作伙伴网站或应用的数据",
    contact: "联系页面"
  },
  en: {
    badge: "Privacy Policy",
    title: "AdmitFlow Privacy Policy",
    updated: "Last updated: June 24, 2026",
    intro:
      "We keep this site simple. You do not need an account to search programs, view school information, or save a list. Saved programs use your browser's local storage and are not uploaded to an AdmitFlow server.",
    sections: [
      {
        title: "Information We Collect",
        body:
          "When you visit the website, servers and hosting services may record standard technical information such as IP address, browser type, access time, visited pages, and error logs. The site itself does not ask users to submit names, phone numbers, school accounts, or application documents."
      },
      {
        title: "Locally Saved Lists",
        body:
          "My List is stored in your browser localStorage and records only the program IDs you choose to save. Clearing browser data or changing devices removes those local records."
      },
      {
        title: "Advertising and Cookies",
        body:
          "If Google AdSense is enabled, Google and its partners may use cookies, web beacons, IP addresses, or other identifiers to serve ads, limit ad frequency, measure performance, or prevent fraud. You can review Google's explanation of how it uses data on partner sites."
      },
      {
        title: "External Links",
        body:
          "Program detail pages link to universities, application systems, ranking sources, and other external sites. Those sites have their own privacy and content policies. After leaving AdmitFlow, review the policy of the site you visit."
      },
      {
        title: "Contact",
        body:
          "If you find a privacy issue, broken link, or want to ask us to remove nonessential information, send details through the contact page."
      }
    ],
    googleLink: "How Google uses data from partner sites or apps",
    contact: "contact page"
  }
} as const;

export default function PrivacyPage() {
  const { language } = useLanguage();
  const text = copy[language];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Badge variant="secondary" className="mb-4">
        {text.badge}
      </Badge>
      <h1 className="text-4xl font-semibold tracking-normal sm:text-5xl">{text.title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{text.updated}</p>
      <p className="mt-6 text-base leading-8 text-muted-foreground">{text.intro}</p>

      <section className="mt-8 grid gap-7">
        {text.sections.map((section) => (
          <article key={section.title}>
            <h2 className="text-xl font-semibold">{section.title}</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{section.body}</p>
          </article>
        ))}
      </section>

      <p className="mt-8 text-sm leading-7 text-muted-foreground">
        <a
          href="https://policies.google.com/technologies/partner-sites"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {text.googleLink}
        </a>
        {" · "}
        <Link href="/contact" className="font-medium text-foreground underline-offset-4 hover:underline">
          {text.contact}
        </Link>
      </p>
    </main>
  );
}
