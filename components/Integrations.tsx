import { INTEGRATIONS } from "@/lib/content";
import Reveal from "./Reveal";
import Section from "./Section";
import SectionHeader from "./SectionHeader";

/**
 * "Works with what you already run" — the vendor stack presented as a compact
 * spec sheet, not a logo wall. Text-only on purpose:
 *
 * - No third-party marks are reproduced from memory (which is how wrong
 *   logos ship). The site reflects the actual capability, and adding a
 *   vendor is a data change in [lib/content.ts:INTEGRATIONS], not an asset
 *   hunt.
 * - Reads coherently alongside the customer LogoMarquee — that band is
 *   "who we've built for", this one is "what we plug into", visually
 *   distinct so the two don't read as duplication.
 *
 * Content stays in code because it's structure, not editorial copy — same
 * rationale as NAV_LINKS and STACK_LAYERS per lib/content.ts's own header.
 */
export default function Integrations() {
  return (
    <Section>
      <SectionHeader
        className="mb-11"
        eyebrow="Integrations"
        title="Runs the stack you already have."
        aside="Cognitive infrastructure that plugs into your models, cloud, data, and delivery — instead of demanding a rebuild."
      />

      <div className="card-grid grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
        {INTEGRATIONS.map((group, i) => (
          <Reveal key={group.title} delay={i * 0.06}>
            <div className="card card-lift flex h-full flex-col gap-4 p-6">
              <div>
                <div className="label-mono mb-1.5 text-t3">{group.title}</div>
                <p className="m-0 text-[13px] leading-[1.5] text-t5">
                  {group.blurb}
                </p>
              </div>
              <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0 pt-1">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="font-mono text-[12px] tracking-[0.02em] text-t3"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
