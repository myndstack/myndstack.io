import { PROCESS_COPY } from "@/lib/landing/chapters";
import type { ProcessStep } from "@/lib/sanity/queries";

import { blockStyle, landStyle, markerStyle } from "../engine/plan";
import { DrawingPoster } from "../engine/Posters";

/** One line glyph per step (120×120). */
const GLYPHS = [
  // Discovery: a lens over a grid.
  "M20 30h50M20 50h50M20 70h30M30 20v60M50 20v40M70 20v30M72 72a18 18 0 1 0 0.1 0M86 86l16 16",
  // Architecture: boxes wired together.
  "M14 18h36v26H14zM70 18h36v26H70zM42 76h36v26H42zM32 44v14h28v18M88 44v14H60",
  // Build: stacked blocks and a bracket.
  "M18 92h84M26 92V70h28v22M58 92V52h28v40M42 70V48h28M30 30l-12 12 12 12M90 30l12 12-12 12",
  // Ship & support: a path launching, then orbiting.
  "M18 102C40 96 58 80 70 58S90 22 102 18M86 18h16v16M24 66a44 18 -20 1 0 88 -30",
] as const;

/** The process beats, one per step (lib/landing/engine/beats.ts). */
const BUILDS = ["build-1", "build-2", "build-3", "build-4"] as const;

type Props = {
  readonly steps: readonly ProcessStep[];
};

/**
 * §05 — how a build runs, as the engine being built: 01 a sketch, 02 exploded
 * and dimensioned, 03 seated part by part, 04 powered on. A FRAME: the steps
 * hold still beside the engine while each one plays; the active step's numeral
 * and glyph turn lime and the rail fills (`data-step`, from the director).
 */
export default function Process({ steps }: Props) {
  return (
    <section
      id="process"
      className="process ms-frame seam-from-ink"
      data-surface="graphite"
      aria-labelledby="process-title"
      style={{ ...blockStyle("process"), ...landStyle(["process"], "build-1") }}
    >
      {BUILDS.map((id) => (
        <span key={id} className="ms-marker" data-beat-marker={id} style={markerStyle("process", id)} />
      ))}
      <div className="ms-frame-sticky">
        <div className="page-col ms-grid">
          <div className="ms-copy process-copy">
            <p className="chapter-kicker">
              <span className="stamp">§05</span>
              <span>{PROCESS_COPY.kicker}</span>
            </p>
            <h2 id="process-title" className="chapter-title process-title">
              {PROCESS_COPY.title}
            </h2>

            <ol className="steps" aria-label="Steps, in order">
              {steps.map((step, i) => (
                <li key={step.n} className="step" data-n={i + 1}>
                  <svg viewBox="0 0 120 120" className="step-glyph" aria-hidden="true" focusable="false">
                    <path d={GLYPHS[i % GLYPHS.length]} />
                  </svg>
                  <div className="step-body">
                    <h3 className="step-t">
                      <span className="step-n">{step.n}</span>
                      {step.t}
                    </h3>
                    <p className="step-d">{step.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="engine-slot engine-slot--draw" aria-hidden="true">
            <DrawingPoster id="build-4" />
          </div>
        </div>
      </div>
    </section>
  );
}
