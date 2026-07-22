import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/content";
import { LEGAL_SLUGS } from "@/lib/legal";
import { ROLES } from "@/lib/roles";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: SITE_URL, lastModified, changeFrequency: "monthly", priority: 1 },
    {
      url: `${SITE_URL}/careers`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...ROLES.map((role) => ({
      url: `${SITE_URL}/careers/${role.slug}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...LEGAL_SLUGS.map((slug) => ({
      url: `${SITE_URL}/${slug}`,
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
