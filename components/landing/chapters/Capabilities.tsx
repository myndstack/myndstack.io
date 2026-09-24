import type { CSSProperties } from "react";

import { CAPABILITY_HUES, CAPABILITY_SPECS, FINALE } from "@/lib/landing/chapters";
import type { Capability } from "@/lib/sanity/queries";

import CoreRingMini from "../core/CoreRingMini";
import SpecPanel from "../core/SpecPanel";
import { blockStyle, landStyle } from "../engine/plan";

const HUE_VAR = {
  ai: "var(--color-spec-ai)",
  product: "var(--color-spec-product)",
  design: "var(--color-spec-design)",
  arch: "var(--color-spec-arch)",
} as const;

type Props = {
  /** From Sanity, in order (01 Cognitive AI … 04 Architecture & delivery). */
  readonly capabilities: readonly Capability[];
  /** The primary CTA label (Sanity hero.ctaPrimary). */
  readonly cta: string;
};

/**
 * §03 — the engine rises back to face-on and becomes a porthole: one
 * capability per screen lights its arc, turns the playhead to it, builds its
 * demo inside the ring and shows its spec on the readout plate under it (all
 * on the stage). The finale lights the whole spectrum.
 *
 * Only the first four capabilities get a hue and a demo (the design has four);
 * the words always come from the CMS. The static layout gives each article its
 * own small ring and spec instead.
 */
export default function Capabilities({ capabilities, cta }: Props) {
  const caps = capabilities.slice(0, CAPABILITY_HUES.length);
  const total = caps.length;

  return (
    <section
      id="capabilities"
      className="caps"
      data-surface="graphite"
      aria-labelledby="caps-title"
      style={landStyle(["caps-entry", "cap-0"], "cap-0")}
    >
      <h2 id="caps-title" className="sr-only">
        Capabilities
      </h2>
      {/* The rise from the paper to face-on: the engine's alone on screen. */}
      <div className="caps-entry" aria-hidden="true" style={blockStyle("caps-entry")} />

      {caps.map((cap, i) => {
        const hue = CAPABILITY_HUES[i];
        return (
          <article
            key={cap.n}
            data-cap={i}
            className="cap ms-block"
            style={{ ...blockStyle(`cap-${i}`), "--hue": HUE_VAR[hue] } as CSSProperties}
            aria-labelledby={`cap-${i}`}
          >
            <div className="page-col ms-grid">
              <div className="ms-copy cap-copy" data-beat-marker={`cap-${i}`}>
                <p className="chapter-kicker cap-kicker">
                  <span className="stamp">§03</span>
                  <span>
                    Capabilities · {String(i + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
                  </span>
                </p>
                <h3 id={`cap-${i}`} className="cap-title">
                  {cap.title}
                </h3>
                <ul className="cap-points">
                  {cap.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <p className="cap-metric">
                  <span className="cap-metric-v">{cap.metric}</span>
                  <span className="cap-metric-l">{cap.metricLabel}</span>
                </p>
              </div>

              <div className="engine-slot engine-slot--cap" aria-hidden="true">
                <div className="cap-mini" data-hue={hue}>
                  <CoreRingMini />
                </div>
                <SpecPanel
                  file={CAPABILITY_SPECS[i].file}
                  lines={CAPABILITY_SPECS[i].lines}
                  index={i}
                  total={total}
                  hue={HUE_VAR[hue]}
                />
              </div>
            </div>
          </article>
        );
      })}

      <div className="cap-finale ms-block" style={blockStyle("finale")}>
        <div className="page-col ms-grid">
          <div className="ms-copy" data-beat-marker="finale">
            <p className="chapter-kicker">
              <span className="stamp">§03</span>
              <span>{FINALE.kicker}</span>
            </p>
            <p className="cap-finale-line">{FINALE.line}</p>
            <a href="#contact" className="btn btn-lime cap-finale-cta">
              {cta}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
