import type { CSSProperties } from "react";

import { DISCIPLINES, PLATFORM_COPY, PLATFORM_HUES, PLATFORM_LAYERS } from "@/lib/landing/chapters";

import { blockStyle, markerStyle } from "../engine/plan";
import { DrawingPoster } from "../engine/Posters";

const DEEP = {
  lime: "var(--color-lime-deep)",
  ai: "var(--color-spec-ai-deep)",
  product: "var(--color-spec-product-deep)",
  design: "var(--color-spec-design-deep)",
  arch: "var(--color-spec-arch-deep)",
} as const;

/** The station beats, in layer order (lib/landing/engine/beats.ts). */
const STATIONS = PLATFORM_LAYERS.map((layer) => `st-${layer.title.toLowerCase()}`);

/**
 * §02 — the stack, on paper: the engine turned upright and exploded into its
 * four layers. First the overview (a FRAME: the copy and its legend hold
 * still while the engine does), then one station per layer — the camera
 * descends the tower, each layer pulled out in turn — then the layers lock.
 *
 * The paper's top and bottom edges are scan lines: the engine turns to a
 * blueprint exactly where the page does.
 */
export default function Platform() {
  return (
    <section
      id="platform"
      className="platform scan-top scan-bottom"
      data-surface="paper"
      aria-labelledby="platform-title"
    >
      <span className="scan-head scan-head--top" aria-hidden="true" />

      <div className="platform-stack ms-frame" style={blockStyle("stack")}>
        <span className="ms-marker" data-beat-marker="stack" style={markerStyle("stack", "stack")} />
        {/* The nav's "Stack" target: lands on the overview's hold when pinned. */}
        <span id="platform-anchor" className="platform-anchor" />
        <div className="ms-frame-sticky">
          <div className="page-col ms-grid">
            <div className="ms-copy platform-copy">
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
            </div>
            <div className="engine-slot engine-slot--draw" aria-hidden="true">
              <DrawingPoster id="stack" />
            </div>
          </div>
        </div>
      </div>

      {PLATFORM_LAYERS.map((layer, i) => (
        <div
          key={layer.n}
          className="station ms-block"
          data-layer={i}
          style={{ ...blockStyle(STATIONS[i]), "--plate-hue": DEEP[PLATFORM_HUES[i]] } as CSSProperties}
        >
          <div className="page-col ms-grid">
            <div className="engine-slot engine-slot--draw engine-slot--band" aria-hidden="true">
              <DrawingPoster id={STATIONS[i]} />
            </div>
            <div className="ms-copy station-copy" data-beat-marker={STATIONS[i]}>
              <p className="chapter-kicker station-kicker">
                <span className="stamp">
                  {layer.n} / {String(PLATFORM_LAYERS.length).padStart(2, "0")}
                </span>
                <span>{layer.title}</span>
              </p>
              <h3 className="station-title">{layer.meta}</h3>
              <ul className="station-disciplines" aria-label={`${layer.title}: disciplines`}>
                {DISCIPLINES.filter((d) => d.layer === i).map((d) => (
                  <li key={d.label}>{d.label}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ))}

      <div className="locked ms-block" style={blockStyle("locked")}>
        <div className="page-col ms-grid">
          <p className="ms-copy locked-readout hud" aria-hidden="true" data-beat-marker="locked">
            <span className="hud-k">Layers locked</span>
            <span>
              {String(PLATFORM_LAYERS.length).padStart(2, "0")} / {String(PLATFORM_LAYERS.length).padStart(2, "0")}
            </span>
          </p>
        </div>
      </div>

      <span className="scan-head scan-head--bottom" aria-hidden="true" />
    </section>
  );
}
