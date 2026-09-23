import type { Metadata } from "next";

import { SITE_URL } from "@/lib/content";

/**
 * The root `app/opengraph-image.tsx` card. Next only attaches a file-based image
 * to a page that doesn't set its own `openGraph`; once a page does, the image
 * has to be restated. But an explicit image also beats a segment's own
 * `opengraph-image` file, so those segments pass `ownImage` to leave it out.
 */
export const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Myndstack — Founder-led AI & software engineering studio",
} as const;

type PageMeta = {
  /** Root-relative path, e.g. "/privacy". */
  readonly path: string;
  readonly title: string;
  readonly description: string;
  /** The segment ships its own `opengraph-image` file — don't override it. */
  readonly ownImage?: boolean;
};

/**
 * Per-page metadata with complete social fields.
 *
 * Next merges metadata shallowly: a page that sets `openGraph: { title }`
 * replaces the root layout's whole object and drops `url`, `siteName` and
 * `type`; a page that sets none inherits the homepage's title and URL. Either
 * way a shared link previewed as the wrong page. Build every page's set here.
 */
export function pageMetadata({ path, title, description, ownImage = false }: PageMeta): Metadata {
  // Omit the key entirely when the segment has its own file: even an explicit
  // `images: undefined` suppresses the file-based image.
  const images = ownImage ? {} : { images: [OG_IMAGE] };
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
      ...images,
    },
    twitter: { card: "summary_large_image", title, description, ...images },
  };
}
