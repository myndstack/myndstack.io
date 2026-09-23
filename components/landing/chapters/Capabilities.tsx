import type { CSSProperties } from "react";

import { CAPABILITY_HUES, CAPABILITY_SPECS, FINALE } from "@/lib/landing/chapters";
import type { Capability } from "@/lib/sanity/queries";

import CapDemos from "../core/CapDemos";
import CoreRingMini from "../core/CoreRingMini";
import CoreStage from "../core/CoreStage";
import SpecPanel from "../core/SpecPanel";
import MotionChapter from "../motion/MotionChapter";

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
 * §03 — Run B: the Core rises back out from behind the paper and, chapter by
 * chapter, lights one discipline's arc while a demo plays inside the ring and
 * a spec panel shows how that kind of build is shaped. The finale lights the
 * whole spectrum ("end to end"), then unrolls the ring into a bar that hands
 * off to the work.
 *
 * Only the first four capabilities get a hue/demo (the design has four); the
 * words always come from the CMS. Static layout (phones, reduced motion,
 * no JS): no stage — each article shows its own small ring and spec panel.
 */
export default function Capabilities({ capabilities, cta }: Props) {
  const caps = capabilities.slice(0, CAPABILITY_HUES.length);
  const total = caps.length;

  const underlay = CAPABILITY_HUES.map((hue, i) => (
    <div key={hue} className="caps-wash" data-wash={i} style={{ "--wash": HUE_VAR[hue] } as CSSProperties} />
  ));
  const overlay = (
    <>
      {/* The finale's hand-off: the ring turns edge-on and becomes this bar. */}
      <div className="caps-bar" data-caps-bar>
        {(["lime", "ai", "product", "design", "arch"] as const).map((key) => (
          <i key={key} data-hue={key} />
        ))}
      </div>
      <div className="spec-panels">
      {caps.map((_, i) => (
        <SpecPanel
          key={i}
          panel
          file={CAPABILITY_SPECS[i].file}
          lines={CAPABILITY_SPECS[i].lines}
          index={i}
          total={total}
          hue={HUE_VAR[CAPABILITY_HUES[i]]}
        />
      ))}
      </div>
    </>
  );

  return (
    <section id="capabilities" className="caps" aria-labelledby="caps-title">
      <h2 id="caps-title" className="sr-only">
        Capabilities
      </h2>
      <MotionChapter id="core-caps" kind="scrub" className="core-run core-run--caps">
        <CoreStage
          prefix="caps"
          placement="caps"
          inner={<CapDemos />}
          underlay={underlay}
          overlay={overlay}
        />

        <div className="core-flow">
          {caps.map((cap, i) => {
            const hue = CAPABILITY_HUES[i];
            return (
              <article
                key={cap.n}
                data-segment
                data-cap={i}
                className="cap"
                style={{ "--hue": HUE_VAR[hue] } as CSSProperties}
                aria-labelledby={`cap-${i}`}
              >
                <div className="page-col cap-inner">
                  <div className="cap-copy">
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

                  <div className="cap-inline" aria-hidden="true">
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

          <div data-segment className="cap-finale">
            <div className="page-col">
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
      </MotionChapter>
    </section>
  );
}
