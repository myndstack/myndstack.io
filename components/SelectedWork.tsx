import Link from "next/link";

import { getCases } from "@/lib/sanity/queries";
import Reveal from "./Reveal";
import Section from "./Section";
import SectionHeader from "./SectionHeader";

/** Cards show the headline pair; the detail page shows the full set. */
const CARD_METRICS = 2;

export default async function SelectedWork() {
  const cases = await getCases();
  // Nothing to show if every case study is unpublished — render nothing rather
  // than read `.slug` off an undefined featured case and 500 the homepage.
  if (cases.length === 0) return null;

  // Same derivation the old cases.ts helpers used: one featured card, the rest
  // as supporting cards. Ordering already comes from the query.
  const featured = cases.find((c) => c.featured) ?? cases[0];
  const supporting = cases.filter((c) => c !== featured);

  return (
    <Section id="work-cases">
      <SectionHeader
        className="mb-9"
        titleMaxWidth="620px"
        eyebrow="Selected work"
        title="Stacks we built, running in production."
        aside="A sample of the cognitive infrastructure we've architected and shipped with partner teams."
      />

      <div className="flex flex-col gap-[18px]">
        {/* Featured case */}
        <Reveal>
          <Link
            href={`/work/${featured.slug}`}
            className="card clip-angular-32 grid grid-cols-1 items-center gap-11 px-10 py-[38px] text-white hover:border-lime-edge hover:text-white md:grid-cols-[1.25fr_1fr]"
          >
            <div>
              <div className="mb-5 flex flex-wrap gap-2">
                {featured.tags.map((tag) => (
                  <span key={tag} className="chip">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mb-3 font-display text-[clamp(24px,4vw,31px)] font-bold tracking-[-0.02em]">
                {featured.client}
              </div>
              <p className="m-0 max-w-[440px] text-base leading-[1.55] text-t4">
                {featured.summary}
              </p>
              <span className="mt-5 inline-block font-mono text-[11px] tracking-[0.14em] text-lime uppercase">
                Read the case ▸
              </span>
            </div>

            {/* 1px grid gaps act as the hairlines between metrics */}
            <div className="grid grid-cols-2 gap-px overflow-hidden border border-line bg-line">
              {featured.metrics.map((m) => (
                <div key={m.l} className="bg-surface-3 px-[22px] py-5">
                  <div
                    className={`font-display text-[26px] font-bold tracking-[-0.02em] ${m.lime ? "text-lime" : ""}`}
                  >
                    {m.v}
                  </div>
                  <div className="mt-[3px] font-mono text-[10.5px] tracking-[0.08em] text-t5 uppercase">
                    {m.l}
                  </div>
                </div>
              ))}
            </div>
          </Link>
        </Reveal>

        {/* Supporting cases */}
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-3">
          {supporting.map((c) => (
            <Reveal key={c.slug}>
              {/* The card is inside the link so the hover lift and the reveal
                  transform don't both try to own `transform`. */}
              <Link href={`/work/${c.slug}`} className="block h-full text-white">
                <div className="card card-lift flex h-full min-h-[248px] flex-col justify-between p-7">
                  <div>
                    <div className="mb-[18px] flex gap-2">
                      {c.tags.map((tag) => (
                        <span key={tag} className="chip">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mb-[9px] font-display text-[21px] font-semibold">
                      {c.client}
                    </div>
                    <p className="m-0 text-[13.5px] leading-[1.55] text-t4">{c.summary}</p>
                  </div>

                  <div className="mt-6 flex gap-[26px] border-t border-line pt-4">
                    {c.metrics.slice(0, CARD_METRICS).map((m) => (
                      <div key={m.l}>
                        <div className="font-display text-[22px] font-bold tracking-[-0.02em]">
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
      </div>

      <p className="mt-9 mb-0 text-[15px] text-t4">
        <Link href="/work">See all work →</Link>
      </p>
    </Section>
  );
}
