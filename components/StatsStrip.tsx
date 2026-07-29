import { getHomepage } from "@/lib/sanity/queries";
import CountUp from "./CountUp";
import Reveal from "./Reveal";
import Section from "./Section";

export default async function StatsStrip() {
  const { stats } = await getHomepage();

  return (
    <Section>
      {/* 1px grid gaps over a line-coloured background become the dividers, so
          they land correctly whether this is 1, 2 or 4 columns. */}
      <Reveal className="grid grid-cols-1 gap-px overflow-hidden border border-line bg-line xs:grid-cols-2 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.l} className="bg-ink px-7 py-8">
            <div className="font-display text-[clamp(30px,5vw,44px)] font-bold tracking-[-0.02em] tabular-nums">
              <CountUp value={stat.v} />
            </div>
            <div className="mt-1 text-[13.5px] text-t4">{stat.l}</div>
          </div>
        ))}
      </Reveal>
    </Section>
  );
}
