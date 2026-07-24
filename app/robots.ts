import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/content";

export default function robots(): MetadataRoute.Robots {
  return {
    // /api is form handlers and the health endpoint — nothing with a reader.
    // (The content editor is a standalone Sanity-hosted Studio, not on this
    // origin, so there is nothing to disallow here for it.)
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
