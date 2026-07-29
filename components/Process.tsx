import { getHomepage } from "@/lib/sanity/queries";
import Reveal from "./Reveal";
import Section from "./Section";
import SectionHeader from "./SectionHeader";

export default async function Process() {
  const { steps } = await getHomepage();

  return (
    <Section id="process">
      <SectionHeader
        className="mb-11 max-w-[600px]"
        eyebrow="How we work"
        title="From first call to production — in four moves."
      />

      {/* Gap-as-divider, so stacked steps get separators too and the last cell
          has no stray trailing rule. */}
      <div className="grid grid-cols-1 gap-px border-t border-line bg-line xs:grid-cols-2 md:grid-cols-4">
        {steps.map((step) => (
          <Reveal
            key={step.n}
            className="relative bg-ink px-[22px] pt-7 pb-[30px] transition-colors hover:bg-surface"
          >
            {/* The lime rule draws itself across as the step reveals. */}
            <div className="ease-brand absolute top-[-1px] left-0 h-0.5 w-0 bg-lime shadow-[0_0_10px_#C9F24D] transition-[width] duration-500 [.is-in>&]:w-full" />
            <div className="mb-[38px] font-mono text-[13px] text-lime">{step.n}</div>
            <div className="mb-2 font-display text-[22px] font-semibold">{step.t}</div>
            <div className="text-sm leading-[1.55] text-t4">{step.d}</div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
