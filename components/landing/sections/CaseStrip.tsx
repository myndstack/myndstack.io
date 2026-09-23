import Link from "next/link";

import type { CaseStudy } from "@/lib/cases";

/**
 * The case cards that followed the old SelectedWork section — every case links
 * to its /work/[slug] page, plus "See all work". Continues the paper surface
 * under the pipeline chapter (kept outside that chapter's MotionChapter so it
 * doesn't lengthen the pinned run).
 */
export default function CaseStrip({ cases }: { readonly cases: readonly CaseStudy[] }) {
  return (
    <section aria-label="Case studies" className="surface-paper paper-sheet border-t border-paper-line">
      <div className="page-column flex flex-col gap-6 py-12 sm:flex-row sm:items-stretch">
        {cases.map((c) => (
          <Link
            key={c.slug}
            href={`/work/${c.slug}`}
            className="ease-brand group flex flex-1 flex-col justify-between gap-4 border border-paper-line bg-paper-2 p-6 text-ink transition-colors duration-(--dur-fast) hover:border-ink"
          >
            <span>
              <span className="block font-display text-22 font-semibold">{c.client}</span>
              <span className="mt-2 block text-15 leading-body text-paper-t4">{c.lede}</span>
            </span>
            <span className="font-mono text-12 font-bold tracking-label uppercase">Read the case →</span>
          </Link>
        ))}
        <Link
          href="/work"
          className="ease-brand flex items-center justify-center border border-ink px-8 py-6 font-display text-17 font-semibold text-ink transition-colors duration-(--dur-fast) hover:bg-ink hover:text-paper sm:w-64"
        >
          See all work →
        </Link>
      </div>
    </section>
  );
}
