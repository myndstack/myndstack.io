import { INTEGRATIONS } from "@/lib/content";
import Reveal from "./Reveal";
import Section from "./Section";
import SectionHeader from "./SectionHeader";

/**
 * "Runs the stack you already have" — the vendor stack as a hairline spec
 * matrix, deliberately NOT a card grid.
 *
 * The homepage had three near-identical 4-card grids in a row (StackStory →
 * Capabilities → Integrations). Capabilities was cut; this section is rebuilt
 * as a single bordered block where each layer is a row — label + blurb on the
 * left, the vendors as natural-case mono tags on the right, rows divided by
 * 1px lines. It reads as a technical spec sheet, giving the mid-page a visual
 * beat that isn't another card grid.
 *
 * Text-only on purpose: no third-party marks are reproduced from memory (which
 * is how wrong logos ship). Adding a vendor is a data change in
 * [lib/content.ts:INTEGRATIONS], not an asset hunt. Content stays in code
 * because it's structure, not editorial copy — same rationale as NAV_LINKS and
 * STACK_LAYERS per lib/content.ts's own header.
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

      <Reveal>
        <div className="border border-line">
          {INTEGRATIONS.map((group, i) => (
            // Two columns from `sm` (760px), NOT `md` (1000px). This project's
            // md is 1000px, so gating the 2-col on md left every 760–1000px
            // window in a sparse, full-width single-column stack. Label column
            // is fixed so the tag columns line up row to row; tightened padding
            // and gaps so it reads as a dense spec sheet.
            <div
              key={group.title}
              className={`grid grid-cols-1 gap-x-8 gap-y-3 px-5 py-6 sm:grid-cols-[190px_1fr] sm:items-baseline sm:px-7${
                i > 0 ? " border-t border-line" : ""
              }`}
            >
              <div>
                <div className="font-display text-[17px] font-semibold">
                  {group.title}
                </div>
                <p className="m-0 mt-1 text-[13px] leading-[1.45] text-t5">
                  {group.blurb}
                </p>
              </div>
              {/* Natural-case mono tags — brand casing preserved (OpenAI,
                  BigQuery), so NOT the uppercase `.chip` primitive. */}
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="ease-brand border border-line-3 px-2.5 py-1 font-mono text-[12px] tracking-[0.01em] text-t3 transition-colors duration-160 hover:border-lime-edge hover:text-t2"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}
