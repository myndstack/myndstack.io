import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/content";
import { LAST_UPDATED, LEGAL_SLUGS } from "@/lib/legal";
import { getCaseSlugs, getRoleSlugs } from "@/lib/sanity/queries";

/**
 * `lastModified` only where we actually know it. Stamping every URL with
 * `new Date()` told crawlers the whole site changed on every regeneration
 * (every minute under ISR), which teaches them to ignore the field.
 */
const legalUpdated = (() => {
  const date = new Date(LAST_UPDATED);
  return Number.isNaN(date.getTime()) ? undefined : date;
})();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [caseSlugs, roleSlugs] = await Promise.all([getCaseSlugs(), getRoleSlugs()]);

  return [
    { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/work`, changeFrequency: "monthly", priority: 0.9 },
    ...caseSlugs.map((slug) => ({
      url: `${SITE_URL}/work/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    {
      url: `${SITE_URL}/careers`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...roleSlugs.map((slug) => ({
      url: `${SITE_URL}/careers/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    {
      url: `${SITE_URL}/legal`,
      lastModified: legalUpdated,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    ...LEGAL_SLUGS.map((slug) => ({
      url: `${SITE_URL}/${slug}`,
      lastModified: legalUpdated,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
