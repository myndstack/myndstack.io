import Link from "next/link";

import PageHeader from "@/components/PageHeader";
import { LAST_UPDATED, LEGAL_DOCS, type LegalDoc } from "@/lib/legal";

const sectionId = (heading: string) =>
  heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Pager order matches the audience grouping used on /legal so prev/next feels
 * like continuous reading. Any slug the union adds but this array misses will
 * just render without a pager instead of breaking the page.
 */
const PAGER_ORDER: LegalDoc["slug"][] = [
  "privacy",
  "terms",
  "cookies",
  "refunds",
  "dpa",
  "subprocessors",
  "security",
  "responsible-ai",
];

/**
 * Shared body for /privacy, /terms and /security. Each route is a real static
 * segment rather than `/[slug]`, which would otherwise swallow every unknown path.
 */
export default function LegalDocPage({ slug }: { slug: LegalDoc["slug"] }) {
  const doc = LEGAL_DOCS[slug];
  const pagerIndex = PAGER_ORDER.indexOf(slug);
  const prev = pagerIndex > 0 ? LEGAL_DOCS[PAGER_ORDER[pagerIndex - 1]] : null;
  const next =
    pagerIndex >= 0 && pagerIndex < PAGER_ORDER.length - 1
      ? LEGAL_DOCS[PAGER_ORDER[pagerIndex + 1]]
      : null;

  return (
    <>
      <PageHeader
        eyebrow={doc.eyebrow}
        title={doc.title}
        lede={doc.lede}
        meta={`Last updated ${LAST_UPDATED}`}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Legal", href: "/legal" },
        ]}
      />

      <div className="mx-auto max-w-[1200px] px-5 pt-14 pb-[88px] sm:px-14">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[220px_1fr]">
          <nav aria-label="On this page" className="md:sticky md:top-28 md:self-start">
            <h2 className="label-mono mb-4 text-t4">On this page</h2>
            <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
              {doc.sections.map((section, i) => (
                <li key={section.heading}>
                  <a
                    href={`#${sectionId(section.heading)}`}
                    className="ease-brand flex gap-2.5 text-[13.5px] leading-snug text-t4 transition-colors duration-160 hover:text-t2"
                  >
                    <span className="font-mono text-[11px] text-t5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {section.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="legal-prose max-w-[720px]">
            {doc.sections.map((section) => (
              <section key={section.heading}>
                <h2 id={sectionId(section.heading)}>{section.heading}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                ))}
              </section>
            ))}

            <p className="legal-note">
              Questions about this page? <Link href="/#contact">Get in touch</Link>.
            </p>

            {(prev || next) && (
              <nav
                aria-label="Between policies"
                className="mt-14 grid grid-cols-1 gap-px border-t border-line pt-8 sm:grid-cols-2 print:hidden"
              >
                {prev ? (
                  <Link
                    href={`/${prev.slug}`}
                    className="group ease-brand flex flex-col gap-1.5 py-4 pr-4 transition-colors duration-160 sm:pr-8"
                  >
                    <span className="font-mono text-[11px] tracking-[0.14em] text-t5 uppercase">
                      ← Previous
                    </span>
                    <span className="font-display text-[17px] font-semibold text-t2 group-hover:text-lime">
                      {prev.title}
                    </span>
                  </Link>
                ) : (
                  <span aria-hidden="true" />
                )}
                {next ? (
                  <Link
                    href={`/${next.slug}`}
                    className="group ease-brand flex flex-col items-start gap-1.5 py-4 pl-0 transition-colors duration-160 sm:items-end sm:pl-8"
                  >
                    <span className="font-mono text-[11px] tracking-[0.14em] text-t5 uppercase">
                      Next →
                    </span>
                    <span className="font-display text-[17px] font-semibold text-t2 group-hover:text-lime">
                      {next.title}
                    </span>
                  </Link>
                ) : (
                  <span aria-hidden="true" />
                )}
              </nav>
            )}
          </article>
        </div>
      </div>
    </>
  );
}
