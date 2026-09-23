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
            className="relative bg-ink px-6 pt-7 pb-8 transition-colors hover:bg-surface"
          >
            {/* The lime rule draws itself across as the step reveals. */}
            <div className="ease-brand absolute top-[-1px] left-0 h-0.5 w-0 bg-lime shadow-glow transition-[width] duration-600 [.is-in>&]:w-full" />
            <div className="mb-10 font-mono text-13 text-lime">{step.n}</div>
            <div className="mb-2 font-display text-22 font-semibold">{step.t}</div>
            <div className="text-15 leading-[1.55] text-t4">{step.d}</div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
