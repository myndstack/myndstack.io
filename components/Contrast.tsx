import { CONTRAST_WITH, CONTRAST_WITHOUT } from "@/lib/content";
import Reveal from "./Reveal";
import Section from "./Section";
import SectionHeader from "./SectionHeader";

export default function Contrast() {
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
          <div className="mb-[22px] font-mono text-[11.5px] font-bold tracking-[0.12em] text-t5 uppercase">
            Without a unified stack
          </div>
          <ul className="m-0 flex list-none flex-col gap-[15px] p-0">
            {CONTRAST_WITHOUT.map((item) => (
              <li
                key={item}
                className="flex gap-3.5 text-[15.5px] leading-[1.4] text-t4"
              >
                <span className="flex-none text-t7">—</span>
                {item}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal
          delay={0.08}
          className="clip-angular-28 relative overflow-hidden border border-lime bg-surface-3 px-9 py-[34px] shadow-[0_20px_50px_rgba(0,0,0,.4)]"
        >
          <div className="mb-[22px] font-mono text-[11.5px] font-bold tracking-[0.12em] text-lime uppercase">
            With Myndstack
          </div>
          <ul className="m-0 flex list-none flex-col gap-[15px] p-0">
            {CONTRAST_WITH.map((item) => (
              <li
                key={item}
                className="flex gap-3.5 text-[15.5px] leading-[1.4] text-t2"
              >
                <span className="flex-none text-lime">▸</span>
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </Section>
  );
}
