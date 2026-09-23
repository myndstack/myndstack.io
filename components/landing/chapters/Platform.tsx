import type { CSSProperties } from "react";

import { DISCIPLINES, PLATFORM_COPY, PLATFORM_HUES, PLATFORM_LAYERS } from "@/lib/landing/chapters";
import {
  LAYERS,
  PLATE,
  PLATFORM_VIEW,
  labelLayout,
  leaderPath,
  pctX,
  pctY,
  plateFaces,
  plateY,
} from "@/lib/landing/platform-geometry";

import MotionChapter from "../motion/MotionChapter";

const SPOTS = labelLayout(DISCIPLINES);
const DEEP: Record<(typeof PLATFORM_HUES)[number], string> = {
  lime: "var(--color-lime-deep)",
  ai: "var(--color-spec-ai-deep)",
  product: "var(--color-spec-product-deep)",
  design: "var(--color-spec-design-deep)",
  arch: "var(--color-spec-arch-deep)",
};
const BUS = `M${PLATE.cx} ${plateY(0) - PLATE.h - 40}V${plateY(LAYERS - 1) + PLATE.h + PLATE.t + 40}`;
/** Painter's order: the bottom plate first, so upper plates overlap it. */
const PAINT_ORDER = Array.from({ length: LAYERS }, (_, i) => LAYERS - 1 - i);

/**
 * §02 — the stack, on paper. The curtain that rises over the diving Core.
 *
 * Pinned: an exploded isometric stack compresses plate by plate while leader
 * lines draw in from the disciplines that feed each layer; each plate locks
 * in its hue. Static (phones, reduced motion, no JS): the built stack, every
 * line drawn, every layer locked — which is also the server HTML.
 */
export default function Platform() {
  return (
    <section id="platform" className="curtain platform" data-surface="paper" aria-labelledby="platform-title">
      <MotionChapter id="platform" kind="scrub" className="platform-run">
        {/* The nav's "Stack" target: lands mid-build when pinned (see CSS). */}
        <span id="platform-anchor" className="platform-anchor" />
        <div className="platform-frame" data-sticky>
          <div className="page-col platform-grid">
            <div className="platform-copy">
              <p className="chapter-kicker">
                <span className="stamp">§02</span>
                <span>{PLATFORM_COPY.kicker}</span>
              </p>
              <h2 id="platform-title" className="chapter-title">
                {PLATFORM_COPY.title[0]}
                <br />
                {PLATFORM_COPY.title[1]}
              </h2>
              <p className="chapter-lede">{PLATFORM_COPY.lede}</p>

              <ol className="platform-layers">
                {PLATFORM_LAYERS.map((layer, i) => (
                  <li
                    key={layer.n}
                    className="platform-layer is-locked"
                    data-layer={i}
                    style={{ "--plate-hue": DEEP[PLATFORM_HUES[i]] } as CSSProperties}
                  >
                    <span className="platform-layer-n">{layer.n}</span>
                    <span className="platform-layer-t">{layer.title}</span>
                    <span className="platform-layer-m">{layer.meta}</span>
                    <span className="led" aria-hidden="true" />
                  </li>
                ))}
              </ol>
              <p className="platform-count hud" aria-hidden="true">
                <span className="hud-k">Layers locked</span>
                <span>
                  <span data-count>04</span> / 04
                </span>
              </p>
            </div>

            <div className="platform-figure">
              <svg viewBox={`0 0 ${PLATFORM_VIEW.w} ${PLATFORM_VIEW.h}`} aria-hidden="true" focusable="false">
                <path d={BUS} pathLength={1} className="platform-bus draw" />
                {SPOTS.map((spot) => (
                  <path
                    key={spot.label}
                    d={leaderPath(spot)}
                    pathLength={1}
                    data-layer={spot.layer}
                    className="leader draw"
                    style={{ stroke: DEEP[PLATFORM_HUES[spot.layer]] }}
                  />
                ))}
                {PAINT_ORDER.map((i) => {
                  const faces = plateFaces(PLATE.cx, plateY(i));
                  return (
                    <g
                      key={i}
                      className="plate is-locked"
                      data-plate={i}
                      style={{ "--plate-hue": DEEP[PLATFORM_HUES[i]] } as CSSProperties}
                    >
                      <path d={faces.left} className="plate-left" />
                      <path d={faces.right} className="plate-right" />
                      <path d={faces.top} className="plate-top" />
                      <path
                        d={plateFaces(PLATE.cx, plateY(i)).top}
                        className="plate-inset"
                        transform={`translate(${PLATE.cx} ${plateY(i)}) scale(0.62) translate(${-PLATE.cx} ${-plateY(i)})`}
                      />
                    </g>
                  );
                })}
              </svg>

              <ul className="platform-disciplines" aria-label="Disciplines across the stack">
                {SPOTS.map((spot) => (
                  <li
                    key={spot.label}
                    className="discipline is-lit"
                    data-layer={spot.layer}
                    data-side={spot.side}
                    style={
                      {
                        "--x": pctX(spot.x),
                        "--y": pctY(spot.y),
                        "--plate-hue": DEEP[PLATFORM_HUES[spot.layer]],
                      } as CSSProperties
                    }
                  >
                    {spot.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </MotionChapter>
    </section>
  );
}
