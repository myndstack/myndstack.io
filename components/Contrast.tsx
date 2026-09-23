import { getHomepage } from "@/lib/sanity/queries";
import Reveal from "./Reveal";
import Section from "./Section";
import SectionHeader from "./SectionHeader";

export default async function Contrast() {
  const { contrastWith, contrastWithout } = await getHomepage();

  return (
    <Section>
      <SectionHeader
        scrub
        className="mb-9 max-w-[620px]"
        eyebrow="Why one stack"
        title="Stop maintaining the glue."
        lede="Most AI projects run on code nobody owns, stitched between vendors. We architect and build the whole thing as one."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Reveal scrub className="border border-line bg-surface px-9 py-8">
          <div className="mb-6 font-mono text-11 font-bold tracking-[0.12em] text-t5 uppercase">
            Without a unified stack
          </div>
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {contrastWithout.map((item) => (
              <li
                key={item}
                className="flex gap-4 text-15 leading-snug text-t4"
              >
                <span aria-hidden="true" className="flex-none text-t7">—</span>
                {item}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal
          scrub
          delay={0.08}
          className="clip-angular-28 relative overflow-hidden border border-lime bg-surface-3 px-9 py-8 shadow-float"
        >
          <div className="mb-6 font-mono text-11 font-bold tracking-[0.12em] text-lime uppercase">
            With Myndstack
          </div>
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {contrastWith.map((item) => (
              <li
                key={item}
                className="flex gap-4 text-15 leading-snug text-t2"
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
