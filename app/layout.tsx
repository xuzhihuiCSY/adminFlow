import type { Metadata } from "next";

import AppFooter from "@/components/AppFooter";
import AppHeader from "@/components/AppHeader";
import { LanguageProvider } from "@/components/LanguageProvider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://admit-flow.com"),
  title: {
    default: "AdmitFlow - US University Application Navigator",
    template: "%s | AdmitFlow"
  },
  description:
    "AdmitFlow is a personally maintained bilingual US university application navigator for students in China, with curated program deadlines, official links, admissions requirements, source notes, and school ranking context.",
  openGraph: {
    title: "AdmitFlow - US University Application Navigator",
    description:
      "A personal navigator for students in China to compare curated US university application deadlines, requirements, official links, and school ranking context.",
    type: "website"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <LanguageProvider>
          <div className="flex min-h-screen flex-col">
            <AppHeader />
            <div className="flex-1">{children}</div>
            <AppFooter />
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
