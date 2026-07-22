import { CAPABILITIES } from "@/lib/content";
import Reveal from "./Reveal";
import Section from "./Section";
import SectionHeader from "./SectionHeader";

/** The lime card gets the angular clip and inverted ink — the odd one out by design. */
const HIGHLIGHT_INDEX = 1;

export default function Capabilities() {
  return (
    <Section id="work-grid">
      <SectionHeader
        className="mb-9"
        eyebrow="What we do"
        title="From data plane to model — one team."
        aside="We architect cognitive infrastructure for mission-critical software, then build on it with you."
      />

      <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 md:grid-cols-4">
        {CAPABILITIES.map((cap, i) => {
          const highlight = i === HIGHLIGHT_INDEX;

          return (
            // The card sits inside Reveal so the hover lift and the entrance
            // animation don't both try to own `transform`.
            <Reveal key={cap.n} delay={i * 0.08}>
              <div
                className={
                  highlight
                    ? "clip-angular-26 flex h-full min-h-64 flex-col justify-between bg-lime p-[22px] text-lime-ink"
                    : "card card-lift relative flex h-full min-h-64 flex-col justify-between overflow-hidden p-[22px]"
                }
              >
                <div
                  className={`font-mono text-xs ${highlight ? "text-lime-ink-2" : "text-t5"}`}
                >
                  {cap.n}
                </div>

                <div className="flex flex-col gap-4">
                  <div>
                    <div className="mb-3 font-display text-[22px] font-semibold">
                      {cap.title}
                    </div>
                    <ul className="m-0 flex list-none flex-col gap-2 p-0">
                      {cap.points.map((point) => (
                        <li
                          key={point}
                          className={`flex gap-2 text-[12.5px] ${highlight ? "text-lime-ink-3" : "text-t4"}`}
                        >
                          <span className={highlight ? "text-lime-ink-2" : "text-lime"}>
                            ▸
                          </span>
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
                      className={`font-mono text-[11px] ${highlight ? "text-lime-ink-2" : "text-t5"}`}
                    >
                      {cap.metricLabel}
                    </span>
                  </div>
                </div>

                {/* A slow lime sweep marks the last card as the "in motion" one. */}
                {i === CAPABILITIES.length - 1 ? (
                  <div
                    aria-hidden="true"
                    className="animate-sweep pointer-events-none absolute top-0 left-0 h-full w-2/5 bg-[linear-gradient(90deg,transparent,rgba(201,242,77,.14),transparent)]"
                  />
                ) : null}
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
