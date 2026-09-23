import { arcPath, CORE, ringTicks } from "@/lib/motion/core-geometry";

const TICKS = ringTicks({ count: 72, rIn: 436, rOut: 460, rMajorIn: 424, majorEvery: 6 });
const COLOR = {
  lime: "var(--color-lime)",
  ai: "var(--color-spec-ai)",
  product: "var(--color-spec-product)",
  design: "var(--color-spec-design)",
  arch: "var(--color-spec-arch)",
} as const;

/**
 * A small, static Core — no defs, no ids, no masks — safe to repeat anywhere
 * (the founder badge, the contrast switch, the closing band). Arcs carry
 * `data-arc` so CSS can light, dim or break them.
 */
export default function CoreRingMini({ className }: { readonly className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${CORE.size} ${CORE.size}`}
      className={`core-mini${className ? ` ${className}` : ""}`}
      aria-hidden="true"
      focusable="false"
    >
      <path d={TICKS.minor} className="core-mini-tick" />
      <path d={TICKS.major} className="core-mini-tick is-major" />
      {CORE.arcs.map((arc) => (
        <path
          key={arc.key}
          d={arcPath(CORE.cx, CORE.cy, CORE.rArc, arc.a0, arc.a1)}
          data-arc={arc.key}
          className="core-mini-arc"
          style={{ stroke: COLOR[arc.key] }}
        />
      ))}
    </svg>
  );
}
