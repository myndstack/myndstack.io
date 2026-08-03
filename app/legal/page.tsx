import type { Metadata } from "next";
import Link from "next/link";

import PageHeader from "@/components/PageHeader";
import { LAST_UPDATED, LEGAL_DOCS, LEGAL_SLUGS } from "@/lib/legal";

const TITLE = "Policies";
const LEDE =
  "Every policy that governs this site and the engagements we run. Grouped by audience so you can find the one that matters to you.";

export const metadata: Metadata = {
  title: `${TITLE} — Myndstack`,
  description: LEDE,
  alternates: { canonical: "/legal" },
};

/**
 * Manually grouped so the audience (visitor / customer / enterprise buyer) is
 * obvious at a glance. New docs get added to the right group here rather than
 * being flat-listed in slug order, which would bury the important ones under
 * the alphabetically-first.
 */
const GROUPS: {
  title: string;
  blurb: string;
  slugs: readonly (keyof typeof LEGAL_DOCS)[];
}[] = [
  {
    title: "Site & data",
    blurb: "Reading this site, what we do with the details you enter.",
    slugs: ["privacy", "terms", "cookies"] as const,
  },
  {
    title: "Payments",
    blurb:
      "How the Discovery Sprint and project engagements are billed, cancelled, and refunded.",
    slugs: ["refunds"] as const,
  },
  {
    title: "Enterprise & trust",
    blurb: "The paperwork enterprise buyers and their security teams ask for.",
    slugs: ["dpa", "subprocessors", "security", "responsible-ai"] as const,
  },
];

export default function Page() {
  // Sanity check that GROUPS covers every slug — misses would silently hide a
  // policy from this index. Fails the build only in dev; production noops.
  if (process.env.NODE_ENV !== "production") {
    const grouped = new Set(GROUPS.flatMap((g) => g.slugs));
    const missing = LEGAL_SLUGS.filter((s) => !grouped.has(s));
    if (missing.length > 0) {
      console.warn(`[/legal] Ungrouped policy slugs: ${missing.join(", ")}`);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Legal · Index"
        title={TITLE}
        lede={LEDE}
        meta={`Last updated ${LAST_UPDATED}`}
        breadcrumbs={[{ label: "Home", href: "/" }]}
      />

      <div className="mx-auto max-w-[1200px] px-5 pt-14 pb-[88px] sm:px-14">
        <div className="flex flex-col gap-14">
          {GROUPS.map((group) => (
            <section key={group.title}>
              <div className="mb-6 border-b border-line pb-3">
                <h2 className="label-mono m-0 text-t3">{group.title}</h2>
                <p className="mt-1.5 mb-0 max-w-[560px] text-[13.5px] text-t5">
                  {group.blurb}
                </p>
              </div>
              <ul className="m-0 grid list-none grid-cols-1 gap-px bg-line-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
                {group.slugs.map((slug) => {
                  const doc = LEGAL_DOCS[slug];
                  return (
                    <li key={slug}>
                      <Link
                        href={`/${slug}`}
                        className="group ease-brand flex h-full flex-col gap-2 bg-ink p-6 transition-colors duration-160 hover:bg-surface-3"
                      >
                        <div className="font-display text-[17px] font-semibold text-t2 group-hover:text-lime">
                          {doc.title}
                        </div>
                        <p className="m-0 text-[13.5px] leading-[1.55] text-t5">
                          {doc.lede}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
