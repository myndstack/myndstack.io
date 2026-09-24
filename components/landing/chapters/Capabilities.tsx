import { CAPABILITY_HUES, CAPABILITY_ROUTES, CAPABILITY_SPECS, FINALE } from "@/lib/landing/chapters";
import type { Capability } from "@/lib/sanity/queries";

import SpecPanel from "../core/SpecPanel";
import { Beat, Scene, Slot } from "../scene/Scene";
import { Kicker, Lede, Rise, Title } from "../type/Type";

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
 * §03 — the porthole. The tower has turned face-on and the iris has opened
 * onto the SIGNAL chamber; each capability is a detent: the dial turns its
 * arc to 12 o'clock under the lime index and its demo builds in the chamber.
 * The words keep the left column — the title, the capability's code, the
 * points and the metric — and its status line sits top-right: the ring and
 * its bore stay clear of every card.
 * The finale completes the dial and carries the ring left.
 *
 * Only the first four capabilities have a hue and a demo (the design has
 * four); the words always come from the CMS.
 */
export default function Capabilities({ capabilities, cta }: Props) {
  const caps = capabilities.slice(0, CAPABILITY_HUES.length);
  const total = String(caps.length).padStart(2, "0");

  return (
    <Scene id="caps" anchor="capabilities" labelledBy="caps-title">
      <h2 id="caps-title" className="sr-only">
        Capabilities
      </h2>
      {caps.map((cap, i) => {
        const hue = CAPABILITY_HUES[i];
        const n = String(i + 1).padStart(2, "0");
        return (
          <Beat key={cap.n} id={`cap-${i}`} className="cap">
            <div className="cap-side">
              <div className="cap-title">
                <Kicker n="§03">
                  Capabilities · {n} / {total}
                </Kicker>
                <Title as="h3" lines={[cap.title]} />
              </div>
              <Rise i={2} className="cap-spec">
                <SpecPanel file={CAPABILITY_SPECS[i].file} lines={CAPABILITY_SPECS[i].lines} index={i} total={caps.length} hue={HUE_VAR[hue]} />
              </Rise>
              <div className="cap-points">
                <Rise as="ul" i={0} className="points">
                  {cap.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </Rise>
                <Rise as="p" i={1} className="metric">
                  <span className="t-readout">{cap.metric}</span>
                  <span className="t-mono">{cap.metricLabel}</span>
                </Rise>
              </div>
            </div>
            <Rise as="p" i={0} className="cap-detent t-mono-13">
              <span className="led is-on" aria-hidden="true" /> <span className="cap-detent-k">Route</span> {CAPABILITY_ROUTES[i]} · {n}/{total}
            </Rise>
            <Slot beat={`cap-${i}`} />
          </Beat>
        );
      })}

      <Beat id="finale" className="finale">
        <div className="finale-copy">
          <Kicker n="§03">Capabilities · the full set</Kicker>
          <Title lines={[FINALE.kicker + "."]} />
          <Lede>{FINALE.line}</Lede>
          <Rise i={1}>
            <a href="#contact" className="btn btn-lime">
              {cta}
            </a>
          </Rise>
        </div>
        <Slot beat="finale" />
      </Beat>
    </Scene>
  );
}
