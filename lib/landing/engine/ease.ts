/**
 * Easing for the choreography, dependency-free (the director is first-load JS
 * and doesn't pull in anime.js). CSS cubic-bezier semantics.
 */
import type { Bezier } from "./types";

/**
 * cubic-bezier(x1, y1, x2, y2) as a function of progress t ∈ [0, 1]: solve
 * x(s) = t for the curve parameter s (Newton, then bisection), return y(s).
 */
export function bezier([x1, y1, x2, y2]: Bezier): (t: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const x = (s: number) => ((ax * s + bx) * s + cx) * s;
  const dx = (s: number) => (3 * ax * s + 2 * bx) * s + cx;
  const y = (s: number) => ((ay * s + by) * s + cy) * s;

  const solve = (t: number): number => {
    let s = t;
    for (let i = 0; i < 8; i++) {
      const err = x(s) - t;
      if (Math.abs(err) < 1e-7) return s;
      const d = dx(s);
      if (Math.abs(d) < 1e-6) break;
      s -= err / d;
    }
    let lo = 0;
    let hi = 1;
    s = t;
    for (let i = 0; i < 40; i++) {
      const v = x(s);
      if (Math.abs(v - t) < 1e-7) return s;
      if (v < t) lo = s;
      else hi = s;
      s = (lo + hi) / 2;
    }
    return s;
  };

  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return y(solve(t));
  };
}

export const linear = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t);

/**
 * Monotone cubic Hermite through (xs[i], vs[i]) with zero end tangents: flat
 * at both ends (the engine arrives at a hold with no velocity), C1 through
 * interior knots (no stop at a pass-through waypoint), and no overshoot
 * between knots (Fritsch–Carlson). `xs` strictly increasing over [0, 1].
 */
export function monotoneHermite(xs: readonly number[], vs: readonly number[], x: number): number {
  const n = xs.length;
  if (n === 0) return 0;
  if (n === 1 || x <= xs[0]) return vs[0];
  if (x >= xs[n - 1]) return vs[n - 1];
  let k = 0;
  while (k < n - 2 && x > xs[k + 1]) k++;
  const tangent = (i: number): number => {
    if (i === 0 || i === n - 1) return 0;
    const h0 = xs[i] - xs[i - 1];
    const h1 = xs[i + 1] - xs[i];
    const d0 = (vs[i] - vs[i - 1]) / h0;
    const d1 = (vs[i + 1] - vs[i]) / h1;
    if (d0 * d1 <= 0) return 0;
    const w0 = 2 * h1 + h0;
    const w1 = h1 + 2 * h0;
    return (w0 + w1) / (w0 / d0 + w1 / d1);
  };
  const h = xs[k + 1] - xs[k];
  const t = (x - xs[k]) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return h00 * vs[k] + h10 * h * tangent(k) + h01 * vs[k + 1] + h11 * h * tangent(k + 1);
}
