import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import PageHeader from "@/components/PageHeader";
import { SITE_URL } from "@/lib/content";
import { jsonLd } from "@/lib/format";
import { getCase, getCaseSlugs } from "@/lib/sanity/queries";

type Params = { slug: string };

export async function generateStaticParams() {
  return (await getCaseSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const study = await getCase((await params).slug);
  if (!study) return {};

  const title = `${study.client} — Myndstack`;
  return {
    title,
    description: study.lede,
    alternates: { canonical: `/work/${study.slug}` },
    openGraph: { title, description: study.lede },
  };
}

export default async function CasePage({ params }: { params: Promise<Params> }) {
  const study = await getCase((await params).slug);
  if (!study) notFound();

  const facts = [
    { label: "Industry", value: study.industry },
    { label: "Duration", value: study.duration },
    { label: "Footprint", value: study.regions },
    { label: "Stack", value: `${study.stack.length} layers` },
  ];

  const sections = [
    { heading: "The challenge", body: study.challenge },
    { heading: "What we did", body: study.approach },
    { heading: "Where it landed", body: study.outcome },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: `${study.client} — ${study.industry}`,
            description: study.lede,
            about: study.industry,
            author: { "@type": "Organization", name: "Myndstack" },
            publisher: { "@type": "Organization", name: "Myndstack" },
            url: `${SITE_URL}/work/${study.slug}`,
          }),
        }}
      />

      <PageHeader
        eyebrow={`Case study · ${study.industry}`}
        title={study.client}
        lede={study.lede}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Work", href: "/work" },
        ]}
      />

      <div className="mx-auto max-w-[1200px] px-5 pt-14 pb-[88px] sm:px-14">
        {/* Headline metrics — gap-px hairlines, same device as the homepage card. */}
        <div className="mb-14 grid grid-cols-2 gap-px overflow-hidden border border-line bg-line md:grid-cols-4">
          {study.metrics.map((m) => (
            <div key={m.l} className="bg-surface-3 px-6 py-7">
              <div
                className={`font-display text-[clamp(26px,4vw,34px)] font-bold tracking-[-0.02em] ${m.lime ? "text-lime" : ""}`}
              >
                {m.v}
              </div>
              <div className="mt-1.5 font-mono text-[10.5px] tracking-[0.08em] text-t5 uppercase">
                {m.l}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-14 md:grid-cols-[1.15fr_1fr]">
          <article>
            {sections.map((section) => (
              <section key={section.heading} className="legal-prose mb-11">
                <h2>{section.heading}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                ))}
              </section>
            ))}

            <p className="legal-note">
              Something similar on your side?{" "}
              <Link href="/#contact">Tell us the shape of it</Link>.
            </p>
          </article>

          <aside className="md:sticky md:top-28 md:self-start">
            <div className="clip-angular-26 border border-line bg-surface p-7">
              <dl className="m-0">
                {facts.map((fact, i) => (
                  <div
                    key={fact.label}
                    className={i > 0 ? "mt-4 border-t border-line pt-4" : undefined}
                  >
                    <dt className="label-mono mb-1.5 text-t4">{fact.label}</dt>
                    <dd className="m-0 font-display text-[15px] font-semibold">
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-6 border-t border-line pt-5">
                <div className="label-mono mb-3 text-t4">Layers</div>
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                  {study.stack.map((layer) => (
                    <li
                      key={layer}
                      className="flex gap-2.5 text-[14px] leading-snug text-t3"
                    >
                      <span aria-hidden="true" className="flex-none text-lime">
                        ▸
                      </span>
                      {layer}
                    </li>
                  ))}
                </ul>
              </div>

              <Link href="/work" className="btn btn-outline mt-7 block text-center">
                All case studies
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
