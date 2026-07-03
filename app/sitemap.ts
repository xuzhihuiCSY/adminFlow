import type { MetadataRoute } from "next";

import { programs } from "@/lib/programs";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://admit-flow.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/rankings",
    "/my-list",
    "/about",
    "/methodology",
    "/privacy",
    "/contact"
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: `${siteUrl}${route}`,
      lastModified: new Date()
    })),
    ...programs.map((program) => ({
      url: `${siteUrl}/program/${program.id}`,
      lastModified: new Date()
    }))
  ];
}
