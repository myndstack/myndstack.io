import { getHomepage } from "@/lib/sanity/queries";
import Check from "./Check";
import Reveal from "./Reveal";
import Section from "./Section";
import SectionHeader from "./SectionHeader";

/** The lime tile — the odd one out by design; kept as the single colour accent. */
const HIGHLIGHT_INDEX = 1;

/**
 * Bento spans for the canonical 4-capability set: one large tall tile, one wide,
 * two small — so the section stops reading as another uniform 4-column grid.
 * Only applied when there are exactly 4 items; any other count falls back to a
 * plain responsive grid so a CMS change can't break the layout.
 *
 *   +--------+--------+
 *   |        |   1    |   0 = big (2×2), 1 = wide (top-right),
 *   |   0    +---+----+   2 = small, 3 = small (bottom-right)
 *   |        | 2 | 3  |
 *   +--------+---+----+
 */
const BENTO_SPANS = [
  "md:col-span-2 md:row-span-2",
  "md:col-span-2",
  "md:col-span-1",
  "md:col-span-1",
];

export default async function Capabilities() {
  const { capabilities } = await getHomepage();
  const bento = capabilities.length === 4;

  return (
    <Section id="work-grid">
      <SectionHeader
        className="mb-9"
        eyebrow="What we do"
        title="From data plane to model — one team."
        aside="We architect cognitive infrastructure for mission-critical software, then build on it with you."
      />

      <div
        className={`grid grid-cols-1 gap-4 xs:grid-cols-2 ${
          bento ? "md:grid-cols-4 md:grid-rows-2" : "md:grid-cols-4"
        }`}
      >
        {capabilities.map((cap, i) => {
          const highlight = i === HIGHLIGHT_INDEX;
          const span = bento ? `${BENTO_SPANS[i]} h-full` : "";

          return (
            // The tile sits inside Reveal so the hover lift and the entrance
            // animation don't both try to own `transform`.
            <Reveal key={cap.n} delay={i * 0.08} className={span}>
              <div
                className={`flex h-full min-h-64 flex-col justify-between p-[22px] ${
                  highlight
                    ? "clip-angular-26 bg-lime text-lime-ink"
                    : "card card-lift"
                }`}
              >
                <div
                  className={`font-mono text-xs ${highlight ? "text-lime-ink-2" : "text-t5"}`}
                >
                  {cap.n}
                </div>

                <div className="flex flex-col gap-4">
                  <div>
                    <div className="h3-card mb-3">{cap.title}</div>
                    <ul className="m-0 flex list-none flex-col gap-2 p-0">
                      {cap.points.map((point) => (
                        <li
                          key={point}
                          className={`flex items-start gap-2 text-body-sm ${highlight ? "text-lime-ink-3" : "text-t4"}`}
                        >
                          <Check
                            size={14}
                            className={`mt-1 flex-none ${highlight ? "text-lime-ink-2" : "text-lime"}`}
                          />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div
                    className={`border-t pt-3.5 ${highlight ? "border-lime-ink/20" : "border-line"}`}
                  >
                    <span className="font-display text-[19px] font-bold">
                      {cap.metric}
                    </span>{" "}
                    <span
                      className={`font-mono text-caption ${highlight ? "text-lime-ink-2" : "text-t5"}`}
                    >
                      {cap.metricLabel}
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
