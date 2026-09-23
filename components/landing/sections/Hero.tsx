import Annot from "../blueprint/Annot";
import MagneticSpring from "../motion/MagneticSpring";
import MotionChapter from "../motion/MotionChapter";
import { FIG, HERO_NODES, LANDING_HEADLINE } from "@/lib/landing/content";

type Props = {
  readonly eyebrow: string;
  readonly subhead: string;
  readonly ctaPrimary: string;
  readonly ctaSecondary: string;
};

const BOX_W = 120;
const BOX_H = 72;

/** One node of the system diagram, drawn around a centre point. */
function Node({ cx, cy, label, note }: { cx: number; cy: number; label: string; note: string }) {
  const x = cx - BOX_W / 2;
  const y = cy - BOX_H / 2;
  return (
    <g>
      {/* The dashed draft outline, then the built box fading in over it. */}
      <rect className="bp-dash text-t6" x={x} y={y} width={BOX_W} height={BOX_H} />
      <rect className="bp-solid fill-surface-3 stroke-lime" x={x} y={y} width={BOX_W} height={BOX_H} strokeWidth={1.5} />
      <text className="fill-t1 font-mono" x={cx} y={cy + 4} textAnchor="middle" fontSize={12} letterSpacing="0.12em">
        {label.toUpperCase()}
      </text>
      <text className="fill-t5 font-mono" x={cx} y={y + BOX_H + 18} textAnchor="middle" fontSize={10} letterSpacing="0.1em">
        {note}
      </text>
    </g>
  );
}

/** Wide diagram (sm and up): the three nodes in a row, with an eval loop. */
function DiagramWide() {
  const cxs = [80, 280, 480];
  const cy = 90;
  return (
    <svg data-diagram="wide" viewBox="0 0 560 230" className="hidden w-full sm:block" aria-hidden="true">
      <g className="text-lime">
        <path className="bp-line" pathLength={1} d={`M${cxs[0] + BOX_W / 2} ${cy} H${cxs[1] - BOX_W / 2}`} />
        <path className="bp-line" pathLength={1} d={`M${cxs[1] + BOX_W / 2} ${cy} H${cxs[2] - BOX_W / 2}`} />
        <path
          className="bp-line opacity-50"
          pathLength={1}
          d={`M${cxs[2]} ${cy + BOX_H / 2 + 30} V200 H${cxs[0]} V${cy + BOX_H / 2 + 30}`}
        />
      </g>
      <text className="fill-t5 font-mono" x={280} y={218} textAnchor="middle" fontSize={10} letterSpacing="0.1em">
        EVAL LOOP
      </text>
      {HERO_NODES.map((n, i) => (
        <Node key={n.id} cx={cxs[i]} cy={cy} label={n.label} note={n.note} />
      ))}
      {[cxs[0] + BOX_W / 2, cxs[1] - BOX_W / 2, cxs[1] + BOX_W / 2, cxs[2] - BOX_W / 2].map((x) => (
        <circle key={x} data-port className="fill-lime" cx={x} cy={cy} r={3} />
      ))}
    </svg>
  );
}

/** Tall diagram (phones): the same system, stacked. */
function DiagramTall() {
  const cys = [50, 180, 310];
  const cx = 130;
  return (
    <svg data-diagram="tall" viewBox="0 0 260 370" className="mx-auto block w-full max-w-[260px] sm:hidden" aria-hidden="true">
      <g className="text-lime">
        <path className="bp-line" pathLength={1} d={`M${cx} ${cys[0] + BOX_H / 2} V${cys[1] - BOX_H / 2}`} />
        <path className="bp-line" pathLength={1} d={`M${cx} ${cys[1] + BOX_H / 2} V${cys[2] - BOX_H / 2}`} />
      </g>
      {HERO_NODES.map((n, i) => (
        <Node key={n.id} cx={cx} cy={cys[i]} label={n.label} note={n.note} />
      ))}
      {[cys[0] + BOX_H / 2, cys[1] - BOX_H / 2, cys[1] + BOX_H / 2, cys[2] - BOX_H / 2].map((y) => (
        <circle key={y} data-port className="fill-lime" cx={cx} cy={y} r={3} />
      ))}
    </svg>
  );
}

/**
 * FIG.01 — the hero is the intro. Server HTML is the finished hero; on load
 * the construction guides draw, the FIG label and headline scramble in over
 * their real text, and the system diagram builds from dashed outlines.
 */
export default function Hero({ eyebrow, subhead, ctaPrimary, ctaSecondary }: Props) {
  return (
    <MotionChapter id="hero" kind="once" eager>
      <header id="top" className="relative flex min-h-svh flex-col overflow-hidden border-b border-line">
        {/* Construction guides: plain 1px rules scaled in (no SVG stroke to
            distort when the viewport changes shape). */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 text-lime/20">
          <span data-rule="x" className="bp-rule bp-solid absolute top-[34%] left-0 hidden h-px w-full origin-left bg-current sm:block" />
          <span data-rule="x" className="bp-rule bp-solid absolute bottom-10 left-0 h-px w-full origin-left bg-current" />
          <span data-rule="y" className="bp-rule bp-solid absolute top-0 left-[8%] hidden h-full w-px origin-top bg-current sm:block" />
          <span data-rule="y" className="bp-rule bp-solid absolute top-0 right-[8%] hidden h-full w-px origin-top bg-current sm:block" />
        </div>

        <div className="page-column relative z-2 flex w-full flex-1 flex-col justify-center pt-[calc(48px+var(--nav-height))] pb-16">
          <Annot scramble className="mb-6">
            {FIG.hero}
          </Annot>
          <p className="eyebrow mb-6">{eyebrow}</p>

          <h1 className="landing-h1 m-0 font-display text-display font-normal tracking-display text-balance">
            <span className="landing-h1-text">
              {LANDING_HEADLINE.map((line, i) => (
                <span key={line} className={`block${i === LANDING_HEADLINE.length - 1 ? " text-lime" : ""}`}>
                  {line}
                </span>
              ))}
            </span>
            {/* Filled and scrambled by hero.motion — React never renders into
                it, so splitting it can't fight reconciliation. */}
            <span className="landing-h1-scramble" aria-hidden="true" />
          </h1>

          <div className="mt-12 grid items-end gap-12 md:grid-cols-[1fr_1.1fr]">
            <div>
              <p className="m-0 max-w-[520px] text-17 leading-body text-t3 sm:text-22">{subhead}</p>
              <div className="mt-8 flex flex-wrap gap-4">
                <MagneticSpring>
                  <a href="#contact" className="btn btn-lime">
                    {ctaPrimary}
                  </a>
                </MagneticSpring>
                <MagneticSpring>
                  <a href="#work-cases" className="btn btn-outline">
                    {ctaSecondary}
                  </a>
                </MagneticSpring>
              </div>
            </div>
            <figure className="m-0">
              <DiagramWide />
              <DiagramTall />
            </figure>
          </div>
        </div>
      </header>
    </MotionChapter>
  );
}
