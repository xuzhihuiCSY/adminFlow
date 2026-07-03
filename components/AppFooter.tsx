"use client";

import Link from "next/link";

import { useLanguage } from "@/components/LanguageProvider";

const footerCopy = {
  zh: {
    description:
      "AdmitFlow 是我个人为了方便国内同学而维护的美国大学申请信息导航，汇总项目申请窗口、要求、官方链接和数据来源。",
    explore: "浏览",
    trust: "站点信息",
    programs: "项目库",
    rankings: "学校排行",
    saved: "我的清单",
    methodology: "数据方法",
    about: "关于",
    privacy: "隐私政策",
    contact: "联系",
    disclaimer:
      "本站仅代表个人整理，不代表任何大学或机构。申请要求和截止日期可能变化，提交申请前请以学校官方页面为准。"
  },
  en: {
    description:
      "AdmitFlow is a personal US university application navigator I maintain for students in China, organizing application windows, requirements, official links, and source notes.",
    explore: "Explore",
    trust: "Site information",
    programs: "Programs",
    rankings: "Rankings",
    saved: "My List",
    methodology: "Data Methodology",
    about: "About",
    privacy: "Privacy Policy",
    contact: "Contact",
    disclaimer:
      "This site represents personal organization only and does not represent any university or organization. Application requirements and deadlines can change, so confirm details on official school pages before applying."
  }
} as const;

export default function AppFooter() {
  const { language } = useLanguage();
  const copy = footerCopy[language];

  return (
    <footer className="mt-12 border-t border-border bg-background/85">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <Link href="/" className="text-base font-semibold">
            AdmitFlow
          </Link>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            {copy.description}
          </p>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            {copy.disclaimer}
          </p>
        </div>
        <FooterLinkGroup
          title={copy.explore}
          links={[
            { href: "/", label: copy.programs },
            { href: "/rankings", label: copy.rankings },
            { href: "/my-list", label: copy.saved }
          ]}
        />
        <FooterLinkGroup
          title={copy.trust}
          links={[
            { href: "/methodology", label: copy.methodology },
            { href: "/about", label: copy.about },
            { href: "/privacy", label: copy.privacy },
            { href: "/contact", label: copy.contact }
          ]}
        />
      </div>
    </footer>
  );
}

function FooterLinkGroup({
  title,
  links
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <nav aria-label={title}>
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="mt-3 grid gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-muted-foreground transition hover:text-foreground"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
