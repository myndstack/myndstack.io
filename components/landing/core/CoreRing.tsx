import { arcPath, CORE, ringTicks } from "@/lib/motion/core-geometry";
import { waveform } from "@/lib/motion/field";
import { SPECTRUM } from "@/lib/motion/tokens";

const TICKS = ringTicks({
  count: 180,
  rIn: CORE.rTickIn,
  rOut: CORE.rTickOut,
  rMajorIn: CORE.rTickMajorIn,
  majorEvery: 15,
});
/** The tick sweep reveals through one single-contour stroke in a mask (a dash
 *  on the multi-subpath tick path would restart per tick in Skia). */
const SWEEP = arcPath(CORE.cx, CORE.cy, (CORE.rTickIn + CORE.rTickOut) / 2 - 6, 0, 359.99);
const TRACK = arcPath(CORE.cx, CORE.cy, CORE.rArc, 0, 359.99);
const INNER = arcPath(CORE.cx, CORE.cy, CORE.rInner, 0, 359.99);

/** Static waveform (the canvas draws the live one when it runs). */
const WAVE_BARS = 41;
export const WAVE = Array.from({ length: WAVE_BARS }, (_, i) => {
  const x = CORE.cx + (i - (WAVE_BARS - 1) / 2) * 11;
  const h = 18 + waveform(0, i, WAVE_BARS) * 200;
  return `M${x} ${CORE.cy - h / 2}L${x} ${CORE.cy + h / 2}`;
}).join("");

const ARC_COLOR: Record<(typeof CORE.arcs)[number]["key"], string> = {
  lime: "var(--color-lime)",
  ai: "var(--color-spec-ai)",
  product: "var(--color-spec-product)",
  design: "var(--color-spec-design)",
  arch: "var(--color-spec-arch)",
};

type Props = {
  /** Unique per instance on the page — prefixes the <defs> ids. */
  readonly prefix: string;
  readonly className?: string;
};

/**
 * The Core: 180 ticks, a spectrum of five arcs (brand lime, then AI, Product,
 * Design, Architecture), a playhead and an inner signal. Pure server-rendered
 * SVG in its finished state — every arc drawn — so no JS, reduced motion and
 * print all show the complete ring. Motion only ever changes dash offsets,
 * opacities and transforms on this fixed geometry.
 */
export default function CoreRing({ prefix, className }: Props) {
  const sweep = `${prefix}-sweep`;
  const wave = `${prefix}-wave`;
  return (
    <svg
      viewBox={`0 0 ${CORE.size} ${CORE.size}`}
      className={`core-ring${className ? ` ${className}` : ""}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <mask id={sweep} maskUnits="userSpaceOnUse" x="0" y="0" width={CORE.size} height={CORE.size}>
          <path d={SWEEP} pathLength={1} className="core-sweep" />
        </mask>
        <linearGradient id={wave} gradientUnits="userSpaceOnUse" x1="270" y1="0" x2="730" y2="0">
          <stop offset="0" stopColor={SPECTRUM.ai} />
          <stop offset="0.35" stopColor={SPECTRUM.product} />
          <stop offset="0.5" stopColor={SPECTRUM.lime} />
          <stop offset="0.68" stopColor={SPECTRUM.design} />
          <stop offset="1" stopColor={SPECTRUM.arch} />
        </linearGradient>
      </defs>

      <path d={INNER} className="core-inner" />
      <g className="core-cross">
        <path d="M500 188V238M500 762V812M188 500H238M762 500H812" />
      </g>

      <g mask={`url(#${sweep})`} className="core-ticks">
        <path d={TICKS.minor} className="core-tick" />
        <path d={TICKS.major} className="core-tick-major" />
      </g>

      <path d={TRACK} className="core-track" />
      <g className="core-arcs">
        {CORE.arcs.map((arc) => (
          <path
            key={arc.key}
            d={arcPath(CORE.cx, CORE.cy, CORE.rArc, arc.a0, arc.a1)}
            pathLength={1}
            data-arc={arc.key}
            className="core-arc"
            style={{ stroke: ARC_COLOR[arc.key] }}
          />
        ))}
      </g>

      <g className="core-playhead" data-core-playhead>
        <path d="M500 32L509 16H491Z" />
        <path d="M500 40V70" className="core-playhead-line" />
      </g>

      <g className="core-wave-static" stroke={`url(#${wave})`}>
        <path d={WAVE} />
      </g>
      <circle cx={CORE.cx} cy={CORE.cy} r="5" className="core-dot" />
    </svg>
  );
}

/**
 * The glow under each arc: one HTML layer per arc whose content never changes
 * (a thick arc under a CSS blur). Motion only fades the layer, so it is
 * composited, never re-rasterised — an animated SVG filter would be redrawn on
 * the CPU every frame in WebKit.
 */
export function CoreGlow() {
  return (
    <div className="core-glows" aria-hidden="true">
      {CORE.arcs.map((arc) => (
        <div key={arc.key} className="core-glow" data-glow={arc.key}>
          <div className="core-glow-inner">
            <svg viewBox={`0 0 ${CORE.size} ${CORE.size}`} focusable="false">
              <path
                d={arcPath(CORE.cx, CORE.cy, CORE.rArc, arc.a0 + 2, arc.a1 - 2)}
                style={{ stroke: ARC_COLOR[arc.key] }}
              />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}

/** The still ring's symbol id (one per page, in RingSprite). */
const STILL = "core-ring-still";

/**
 * The Core in its finished state as one <symbol>, for the static layout's
 * slots: a slot never animates its ring, so every slot shares this one
 * (inline — a slot is the first paint on phones). Styled inline: a <use>'s
 * shadow tree doesn't see the page's stylesheets, only inherited custom
 * properties.
 */
export function RingSprite() {
  return (
    <svg className="engine-sprite" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${STILL}-wave`} gradientUnits="userSpaceOnUse" x1="270" y1="0" x2="730" y2="0">
          <stop offset="0" stopColor={SPECTRUM.ai} />
          <stop offset="0.35" stopColor={SPECTRUM.product} />
          <stop offset="0.5" stopColor={SPECTRUM.lime} />
          <stop offset="0.68" stopColor={SPECTRUM.design} />
          <stop offset="1" stopColor={SPECTRUM.arch} />
        </linearGradient>
      </defs>
      <symbol id={STILL} viewBox={`0 0 ${CORE.size} ${CORE.size}`}>
        <path d={INNER} style={{ fill: "none", stroke: "var(--color-t7)", strokeWidth: 1.5, strokeDasharray: "2 9" }} />
        <path d="M500 188V238M500 762V812M188 500H238M762 500H812" style={{ stroke: "var(--color-t7)", strokeWidth: 1.5 }} />
        <path d={TICKS.minor} style={{ stroke: "var(--color-t6)", strokeWidth: 2 }} />
        <path d={TICKS.major} style={{ stroke: "var(--color-t3)", strokeWidth: 2.5 }} />
        <path d={TRACK} style={{ fill: "none", stroke: "var(--color-line-3)", strokeWidth: 7 }} />
        {CORE.arcs.map((arc) => (
          <path key={arc.key} d={arcPath(CORE.cx, CORE.cy, CORE.rArc, arc.a0, arc.a1)} style={{ fill: "none", stroke: ARC_COLOR[arc.key], strokeWidth: 7 }} />
        ))}
        <path d="M500 32L509 16H491Z" style={{ fill: "var(--color-t1)" }} />
        <path d="M500 40V70" style={{ stroke: "var(--color-t1)", strokeWidth: 2 }} />
        <path d={WAVE} style={{ fill: "none", stroke: `url(#${STILL}-wave)`, strokeWidth: 5, strokeLinecap: "round" }} />
        <circle cx={CORE.cx} cy={CORE.cy} r="5" style={{ fill: "var(--color-lime)" }} />
      </symbol>
    </svg>
  );
}

/** A still Core: the shared symbol, placed. */
export function CoreRingStill({ className }: { readonly className?: string }) {
  return (
    <svg viewBox={`0 0 ${CORE.size} ${CORE.size}`} className={`core-ring${className ? ` ${className}` : ""}`} aria-hidden="true" focusable="false">
      <use href={`#${STILL}`} />
    </svg>
  );
}
