import type { CSSProperties } from "react";

import { PROCESS_COPY } from "@/lib/landing/chapters";
import type { ProcessStep } from "@/lib/sanity/queries";

import MotionChapter from "../motion/MotionChapter";

/** One line glyph per step (120×120, pathLength=1 so the scrub can draw them). */
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

type Props = {
  readonly steps: readonly ProcessStep[];
};

/**
 * §05 — how a build runs. Pinned: the steps slide past on a horizontal track
 * under a rail that fills (the spectral bar, now a timeline) and lights each
 * stop. Static: a four-column grid on wide screens, a snap carousel on phones.
 */
export default function Process({ steps }: Props) {
  const n = steps.length;
  return (
    <section id="process" className="process" aria-labelledby="process-title">
      <MotionChapter id="process" kind="scrub" className="process-run">
        <div className="process-frame">
          <div className="page-col process-head">
            <p className="chapter-kicker">
              <span className="stamp">§05</span>
              <span>{PROCESS_COPY.kicker}</span>
            </p>
            <h2 id="process-title" className="chapter-title process-title">
              {PROCESS_COPY.title}
            </h2>
          </div>

          <div className="page-col">
            <div className="process-rail" aria-hidden="true">
              <span className="rail-track" />
              <span className="rail-fill" data-rail-fill />
              {steps.map((step, i) => (
                <span
                  key={step.n}
                  className="rail-stop is-lit"
                  data-stop={i}
                  style={{ left: `${n > 1 ? (i / (n - 1)) * 100 : 0}%` }}
                >
                  <i />
                  <b>{step.n}</b>
                </span>
              ))}
            </div>
          </div>

          <div className="process-viewport">
            {/* Focusable: on phones this is a horizontal scroll region, and
                keyboard users need to be able to scroll it (WCAG 2.1.1). */}
            <ol
              className="process-track"
              data-track
              tabIndex={0}
              aria-label="Steps, in order"
              style={{ "--steps": n } as CSSProperties}
            >
              {steps.map((step, i) => (
                <li key={step.n} className="step" data-step={i}>
                  <svg viewBox="0 0 120 120" className="step-glyph" aria-hidden="true" focusable="false">
                    <path d={GLYPHS[i % GLYPHS.length]} pathLength={1} />
                  </svg>
                  <span className="step-n">{step.n}</span>
                  <h3 className="step-t">{step.t}</h3>
                  <p className="step-d">{step.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </MotionChapter>
    </section>
  );
}
