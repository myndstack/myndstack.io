import type { Metadata } from "next";

import LandingPage from "@/components/landing/LandingPage";
import { LANDING_PREVIEW_PATH } from "@/lib/landing/route";
import { pageMetadata } from "@/lib/metadata";
import { getCases, getFaqs, getHomepage } from "@/lib/sanity/queries";

/**
 * The "Blueprint → Build" redesign, built here until the owner approves it and
 * it's swapped in as "/". Static/ISR exactly like "/" (same cached, tagged
 * Sanity fetches; no cookies or headers). Hidden from search three ways:
 * noindex meta (below), an X-Robots-Tag header (next.config.ts), and no
 * sitemap entry — and it sets its own canonical instead of inheriting "/".
 */
export const metadata: Metadata = {
  ...pageMetadata({
    path: LANDING_PREVIEW_PATH,
    title: "Preview — Myndstack",
    description: "Work-in-progress redesign of the Myndstack homepage.",
  }),
  robots: { index: false, follow: false, nocache: true },
};

export default async function PreviewPage() {
  const [home, faqs, cases] = await Promise.all([getHomepage(), getFaqs(), getCases()]);
  return <LandingPage home={home} faqs={faqs} cases={cases} />;
}
