import Link from "next/link";

import PageHeader from "@/components/PageHeader";
import { LAST_UPDATED, LEGAL_DOCS, type LegalDoc } from "@/lib/legal";

const sectionId = (heading: string) =>
  heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Shared body for /privacy, /terms and /security. Each route is a real static
 * segment rather than `/[slug]`, which would otherwise swallow every unknown path.
 */
export default function LegalDocPage({ slug }: { slug: LegalDoc["slug"] }) {
  const doc = LEGAL_DOCS[slug];

  return (
    <>
      <PageHeader
        eyebrow={doc.eyebrow}
        title={doc.title}
        lede={doc.lede}
        meta={`Last updated ${LAST_UPDATED}`}
        breadcrumbs={[{ label: "Home", href: "/" }]}
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
                    className="flex gap-2.5 text-[13.5px] leading-snug text-t4 hover:text-lime"
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
          </article>
        </div>
      </div>
    </>
  );
}
