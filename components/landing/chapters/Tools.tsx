import type { CSSProperties } from "react";

import { INTEGRATIONS } from "@/lib/content";
import { INTEGRATION_LOGOS } from "@/lib/integration-logos";
import { TOOL_HUES, TOOLS_COPY } from "@/lib/landing/chapters";

import { blockStyle, landStyle, markerStyle } from "../engine/plan";
import { DrawingPoster } from "../engine/Posters";
import MotionChapter from "../motion/MotionChapter";

const DEEP = {
  lime: "var(--color-lime-deep)",
  ai: "var(--color-spec-ai-deep)",
  product: "var(--color-spec-product-deep)",
  design: "var(--color-spec-design-deep)",
  arch: "var(--color-spec-arch-deep)",
  spectrum:
    "linear-gradient(90deg, var(--color-lime-deep), var(--color-spec-ai-deep), var(--color-spec-product-deep), var(--color-spec-design-deep), var(--color-spec-arch-deep))",
} as const;

/**
 * §06 — the tools, on paper: a rack of four groups beside the engine drawn as
 * a flat elevation, with a port on its profile for each group (models,
 * compute, data, and the shaft's end for delivery). A FRAME: the rack holds
 * still while the engine does. Marks are the licensed monochrome set (ink),
 * with name chips for vendors that have none; hover or focus-within dims the
 * other groups.
 */
export default function Tools() {
  return (
    <section
      id="integrations"
      className="tools ms-frame scan-top scan-bottom"
      data-surface="paper"
      aria-labelledby="tools-title"
      style={{ ...blockStyle("tools"), ...landStyle(["tools"], "tools") }}
    >
      <span className="scan-head scan-head--top" aria-hidden="true" />
      <span className="ms-marker" data-beat-marker="tools" style={markerStyle("tools", "tools")} />
      <MotionChapter id="tools" kind="once" className="ms-frame-sticky tools-run">
        <div className="page-col ms-grid">
          <div className="ms-copy tools-copy">
            <p className="chapter-kicker">
              <span className="stamp">§06</span>
              <span>{TOOLS_COPY.kicker}</span>
            </p>
            <h2 id="tools-title" className="chapter-title tools-title">
              {TOOLS_COPY.title}
            </h2>
            <p className="chapter-lede tools-lede">{TOOLS_COPY.lede}</p>

            <ul className="rack-groups">
              {INTEGRATIONS.map((group, i) => {
                const hue = TOOL_HUES[i % TOOL_HUES.length];
                return (
                  <li
                    key={group.title}
                    className="rack-group"
                    data-port={i}
                    style={{ "--hue": DEEP[hue], "--hue-c": hue === "spectrum" ? "var(--color-ink)" : DEEP[hue] } as CSSProperties}
                  >
                    <span className="rack-bar" aria-hidden="true" data-hue={hue} />
                    <h3 className="rack-title">
                      <span className="rack-n">{String(i + 1).padStart(2, "0")}</span>
                      {group.title}
                    </h3>
                    <p className="rack-blurb">{group.blurb}</p>
                    <ul className="rack-items">
                      {group.items.map((item) => {
                        const mark = INTEGRATION_LOGOS[item];
                        return (
                          <li key={item} className="rack-item">
                            {mark ? (
                              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                <path d={mark} fill="currentColor" />
                              </svg>
                            ) : (
                              <span className="rack-chip" aria-hidden="true">
                                {item.slice(0, 2)}
                              </span>
                            )}
                            <span className="rack-name">{item}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="engine-slot engine-slot--draw" aria-hidden="true">
            <DrawingPoster id="tools" />
          </div>
        </div>
      </MotionChapter>
      <span className="scan-head scan-head--bottom" aria-hidden="true" />
    </section>
  );
}
