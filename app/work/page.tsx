import type { Metadata } from "next";
import Link from "next/link";

import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/Reveal";
import { CASES } from "@/lib/cases";

const title = "Selected work — Myndstack";
const description =
  "Cognitive infrastructure we've architected and shipped with partner teams — logistics, healthcare, banking and energy, running in production.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/work" },
  openGraph: { title, description },
};

export default function WorkPage() {
  return (
    <>
      <PageHeader
        eyebrow="Selected work"
        title="Stacks we built, running in production."
        lede="Each of these replaced something that already worked, badly. The interesting part is rarely the model — it's the seams around it."
        meta={`${CASES.length} case studies`}
        breadcrumbs={[{ label: "Home", href: "/" }]}
      />

      <section className="mx-auto max-w-[1200px] px-5 pt-14 pb-[88px] sm:px-14">
        <h2 className="sr-only">Case studies</h2>

        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
          {CASES.map((c, i) => (
            <Reveal key={c.slug} delay={i * 0.06}>
              <Link href={`/work/${c.slug}`} className="block h-full text-white">
                <div className="card card-lift flex h-full flex-col justify-between p-7">
                  <div>
                    <div className="mb-[18px] flex flex-wrap gap-2">
                      {c.tags.map((tag) => (
                        <span key={tag} className="chip">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mb-2.5 font-display text-[clamp(21px,3vw,26px)] font-bold tracking-[-0.02em]">
                      {c.client}
                    </div>
                    <p className="m-0 max-w-[460px] text-[14.5px] leading-[1.55] text-t4">
                      {c.lede}
                    </p>
                  </div>

                  <div className="mt-7 flex flex-wrap gap-[26px] border-t border-line pt-4">
                    {c.metrics.slice(0, 3).map((m) => (
                      <div key={m.l}>
                        <div
                          className={`font-display text-[22px] font-bold tracking-[-0.02em] ${m.lime ? "text-lime" : ""}`}
                        >
                          {m.v}
                        </div>
                        <div className="mt-[3px] font-mono text-[10px] tracking-[0.08em] text-t5 uppercase">
                          {m.l}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>

        <p className="mt-9 mb-0 text-[15px] text-t4">
          Working on something like this?{" "}
          <Link href="/#contact">Tell us the shape of it</Link>.
        </p>
      </section>
    </>
  );
}
