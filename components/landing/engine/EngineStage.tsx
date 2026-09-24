import type { CSSProperties } from "react";

import { CAPABILITY_HUES, CAPABILITY_SPECS } from "@/lib/landing/chapters";
import { DRAW_POSTERS } from "@/lib/landing/engine/posters";

import CapDemos from "../core/CapDemos";
import DocsFan from "../core/DocsFan";
import SpecPanel from "../core/SpecPanel";
import { DrawingPoster, FacePoster } from "./Posters";

const HUE_VAR = {
  ai: "var(--color-spec-ai)",
  product: "var(--color-spec-product)",
  design: "var(--color-spec-design)",
  arch: "var(--color-spec-arch)",
} as const;

type Props = {
  /** How many capabilities the CMS gave us (the readout plate's n / total). */
  readonly caps: number;
};

/**
 * The sticky stage behind the run from the hero to the studio (pinned layout
 * only). Decoration: aria-hidden and inert, nothing focusable; every word is
 * in the flow beside it.
 *
 * Its rail slot (columns 7–12) holds the engine: today the posters — each
 * drawing in two tones, clipped at the paper's edge by the director — and the
 * Core for face poses, in the ring box (hero, work) or at the top of the rail
 * over the readout plate (capabilities). The live canvas (P3) lands in the
 * same boxes and cross-fades over its poster.
 */
export default function EngineStage({ caps }: Props) {
  const tone = (t: "dark" | "paper") => (
    <div className={`engine-tone engine-tone--${t}`}>
      <div className="engine-box">
        {DRAW_POSTERS.map((p) => (
          <DrawingPoster key={p.id} id={p.id} />
        ))}
      </div>
    </div>
  );
  const count = Math.min(caps, CAPABILITY_HUES.length);

  return (
    <div className="engine-stage" data-engine-stage aria-hidden="true" inert>
      <div className="engine-washes">
        {CAPABILITY_HUES.map((hue) => (
          <span key={hue} className="engine-wash" data-wash={hue} style={{ "--wash": HUE_VAR[hue] } as CSSProperties} />
        ))}
      </div>
      {tone("dark")}
      {tone("paper")}
      <div className="engine-box">
        <div className="engine-ring">
          <FacePoster id="face-ring" prefix="stage-ring">
            <DocsFan className="engine-docs" />
          </FacePoster>
        </div>
        <div className="engine-ringtop">
          <FacePoster id="face-top" prefix="stage-top">
            <CapDemos />
          </FacePoster>
        </div>
        <div className="engine-plate">
          {CAPABILITY_HUES.slice(0, count).map((hue, i) => (
            <SpecPanel
              key={hue}
              panel
              file={CAPABILITY_SPECS[i].file}
              lines={CAPABILITY_SPECS[i].lines}
              index={i}
              total={count}
              hue={HUE_VAR[hue]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
