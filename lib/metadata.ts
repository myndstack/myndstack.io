import type { Metadata } from "next";

import { SITE_URL } from "@/lib/content";

type PageMeta = {
  /** Root-relative path, e.g. "/privacy". */
  readonly path: string;
  readonly title: string;
  readonly description: string;
};

/**
 * Per-page metadata with complete social fields.
 *
 * Next merges metadata shallowly: a page that sets `openGraph: { title }`
 * replaces the root layout's whole object and drops `url`, `siteName` and
 * `type`; a page that sets none inherits the homepage's title and URL. Either
 * way a shared link previewed as the wrong page. Build every page's set here.
 */
export function pageMetadata({ path, title, description }: PageMeta): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: `${SITE_URL}${path}`,
      siteName: "Myndstack",
      title,
      description,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}
