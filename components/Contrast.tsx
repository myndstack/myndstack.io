import { getHomepage } from "@/lib/sanity/queries";
import Check from "./Check";
import Reveal from "./Reveal";
import Section from "./Section";
import SectionHeader from "./SectionHeader";

export default async function Contrast() {
  const { contrastWith, contrastWithout } = await getHomepage();

  return (
    <Section>
      <SectionHeader
        className="mb-9 max-w-[620px]"
        eyebrow="Why one stack"
        title="Stop maintaining the glue."
        lede="Most enterprise AI runs on code nobody owns, stitched between vendors. We replace it with one engineered layer."
      />

      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
        <Reveal className="border border-line bg-surface px-9 py-[34px]">
          <h3 className="mb-[22px] font-mono text-caption font-bold tracking-[0.12em] text-t5 uppercase">
            Without a unified stack
          </h3>
          <ul className="m-0 flex list-none flex-col gap-[15px] p-0">
            {contrastWithout.map((item) => (
              <li
                key={item}
                className="flex gap-3.5 text-body-sm text-t4"
              >
                <span aria-hidden="true" className="mt-px flex-none text-t6">
                  —
                </span>
                {item}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal
          delay={0.08}
          className="clip-angular-28 relative overflow-hidden border border-lime bg-surface-3 px-9 py-[34px] shadow-[0_20px_50px_rgba(0,0,0,.4)]"
        >
          <h3 className="mb-[22px] font-mono text-caption font-bold tracking-[0.12em] text-lime uppercase">
            With Myndstack
          </h3>
          <ul className="m-0 flex list-none flex-col gap-[15px] p-0">
            {contrastWith.map((item) => (
              <li key={item} className="flex gap-3.5 text-body-sm text-t2">
                <Check size={15} className="mt-0.5 flex-none text-lime" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </Section>
  );
}
