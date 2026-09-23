/**
 * Geometry of the Core — the spectrum ring at the centre of the landing page.
 * Computed once (on the server) into path strings, so the ring ships as a few
 * static <path>s: nothing is measured in the browser, and every animation is a
 * dash offset, an opacity or a transform on top of fixed geometry.
 *
 * Angles are degrees clockwise from 12 o'clock, in a 1000×1000 viewBox.
 */

export type Point = { readonly x: number; readonly y: number };

const round = (n: number): number => Math.round(n * 100) / 100;

export function polar(cx: number, cy: number, r: number, deg: number): Point {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

type TickOptions = {
  readonly count: number;
  readonly rIn: number;
  readonly rOut: number;
  /** Inner radius of the longer, major ticks. */
  readonly rMajorIn: number;
  readonly majorEvery: number;
  readonly cx?: number;
  readonly cy?: number;
};

/**
 * All ticks as two paths (minor + major), one `M…L` subpath per tick. Two
 * elements instead of 180 keeps the DOM and style recalcs tiny.
 */
export function ringTicks({
  count,
  rIn,
  rOut,
  rMajorIn,
  majorEvery,
  cx = 500,
  cy = 500,
}: TickOptions): { minor: string; major: string } {
  const minor: string[] = [];
  const major: string[] = [];
  for (let i = 0; i < count; i++) {
    const deg = (360 / count) * i;
    const isMajor = i % majorEvery === 0;
    const a = polar(cx, cy, isMajor ? rMajorIn : rIn, deg);
    const b = polar(cx, cy, rOut, deg);
    (isMajor ? major : minor).push(`M${round(a.x)} ${round(a.y)}L${round(b.x)} ${round(b.y)}`);
  }
  return { minor: minor.join(""), major: major.join("") };
}

/** One circular arc as a single contour (so a dash can draw it end to end). */
export function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const start = polar(cx, cy, r, a0);
  const end = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${round(start.x)} ${round(start.y)} A${r} ${r} 0 ${large} 1 ${round(end.x)} ${round(end.y)}`;
}

export type ArcSpan = { readonly a0: number; readonly a1: number; readonly mid: number };

/** `n` equal arcs separated by `gapDeg`, the first starting at `startDeg`. */
export function arcLayout(n: number, gapDeg: number, startDeg: number): ArcSpan[] {
  const span = (360 - n * gapDeg) / n;
  return Array.from({ length: n }, (_, i) => {
    const a0 = startDeg + i * (span + gapDeg);
    const a1 = a0 + span;
    return { a0, a1, mid: (a0 + a1) / 2 };
  });
}

/**
 * The five arcs, clockwise from 12 o'clock: lime (the brand — where every
 * engagement starts), then the four disciplines in chapter order. Keys match
 * `SPECTRUM` in tokens.ts and the `--color-spec-*` tokens.
 */
export const ARC_KEYS = ["lime", "ai", "product", "design", "arch"] as const;
export type ArcKey = (typeof ARC_KEYS)[number];

const ARC_GAP = 8;
const LAYOUT = arcLayout(ARC_KEYS.length, ARC_GAP, -((360 - ARC_KEYS.length * ARC_GAP) / ARC_KEYS.length) / 2);

export const CORE = {
  size: 1000,
  cx: 500,
  cy: 500,
  /** Arc radius (the lit spectrum). */
  rArc: 408,
  /** Tick band. */
  rTickIn: 432,
  rTickOut: 452,
  rTickMajorIn: 422,
  /** Inner guide circle. */
  rInner: 330,
  arcs: ARC_KEYS.map((key, i) => ({ key, ...LAYOUT[i] })),
} as const;
