import { FEATURED_CASE, WORK } from "@/lib/content";
import Reveal from "./Reveal";
import Section from "./Section";
import SectionHeader from "./SectionHeader";

export default function SelectedWork() {
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
          <div className="card clip-angular-32 grid grid-cols-1 items-center gap-11 px-10 py-[38px] hover:border-lime-edge md:grid-cols-[1.25fr_1fr]">
            <div>
              <div className="mb-5 flex flex-wrap gap-2">
                {FEATURED_CASE.tags.map((tag) => (
                  <span key={tag} className="chip">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mb-3 font-display text-[clamp(24px,4vw,31px)] font-bold tracking-[-0.02em]">
                {FEATURED_CASE.client}
              </div>
              <p className="m-0 max-w-[440px] text-base leading-[1.55] text-t4">
                {FEATURED_CASE.desc}
              </p>
            </div>

            {/* 1px grid gaps act as the hairlines between metrics */}
            <div className="grid grid-cols-2 gap-px overflow-hidden border border-line bg-line">
              {FEATURED_CASE.metrics.map((m) => (
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
          </div>
        </Reveal>

        {/* Supporting cases */}
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-3">
          {WORK.map((w) => (
            <Reveal key={w.client}>
              <div className="card card-lift flex h-full min-h-[248px] flex-col justify-between p-7">
                <div>
                  <div className="mb-[18px] flex gap-2">
                    <span className="chip">{w.tag}</span>
                  </div>
                  <div className="mb-[9px] font-display text-[21px] font-semibold">
                    {w.client}
                  </div>
                  <p className="m-0 text-[13.5px] leading-[1.55] text-t4">{w.desc}</p>
                </div>

                <div className="mt-6 flex gap-[26px] border-t border-line pt-4">
                  {[
                    { v: w.m1, l: w.l1 },
                    { v: w.m2, l: w.l2 },
                  ].map((m) => (
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
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
