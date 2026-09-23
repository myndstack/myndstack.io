import type { CSSProperties } from "react";

import { INTEGRATIONS } from "@/lib/content";
import { INTEGRATION_LOGOS } from "@/lib/integration-logos";
import { TOOL_HUES, TOOLS_COPY } from "@/lib/landing/chapters";

import MotionChapter from "../motion/MotionChapter";

const DEEP = {
  lime: "var(--color-lime-deep)",
  ai: "var(--color-spec-ai-deep)",
  product: "var(--color-spec-product-deep)",
  design: "var(--color-spec-design-deep)",
  arch: "var(--color-spec-arch-deep)",
} as const;

/**
 * §06 — the tools, on paper: a "spectrum rack". Each vendor group sits on a
 * tick ruler under its own hue; marks are the licensed monochrome set (ink),
 * with name chips for vendors that have none. Hover or focus-within dims the
 * other groups. No continuous motion here — the rack builds once on entry.
 */
export default function Tools() {
  return (
    <section id="integrations" className="tools" data-surface="paper" aria-labelledby="tools-title">
      <MotionChapter id="tools" kind="once" className="tools-run">
        <div className="page-col">
          <div className="tools-head">
            <div>
              <p className="chapter-kicker">
                <span className="stamp">§06</span>
                <span>{TOOLS_COPY.kicker}</span>
              </p>
              <h2 id="tools-title" className="chapter-title tools-title">
                {TOOLS_COPY.title}
              </h2>
            </div>
            <p className="chapter-lede tools-lede">{TOOLS_COPY.lede}</p>
          </div>

          <div className="rack">
            <span className="rack-ruler" aria-hidden="true" />
            <ul className="rack-groups">
              {INTEGRATIONS.map((group, i) => (
                <li
                  key={group.title}
                  className="rack-group"
                  style={{ "--hue": DEEP[TOOL_HUES[i % TOOL_HUES.length]] } as CSSProperties}
                >
                  <span className="rack-bar" aria-hidden="true" />
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
              ))}
            </ul>
          </div>
        </div>
      </MotionChapter>
    </section>
  );
}
