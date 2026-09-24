/**
 * The smoothing between the page's scroll and the engine: a critically
 * damped spring, solved exactly. The exponential glide it replaces jumped at
 * every wheel notch (its velocity reset on each new target); a spring carries
 * its velocity through, so a flick reads as one continuous move.
 *
 * Exact, not integrated: stepping 1/30 s once lands on the same state as
 * 1/60 s twice or 1/144 s 4.8 times, so the object moves identically at every
 * refresh rate. Only the pose is smoothed — anything anchored to the page
 * (scan lines, feathers, boundaries) reads the raw scroll.
 */

export type SpringState = { readonly x: number; readonly v: number };

/** Stiffness (rad/s): fine pointers glide; touch, which already has momentum, less so. */
export const SPRING_OMEGA = { fine: 16, coarse: 22 } as const;

/**
 * Advance `dt` seconds toward `target`. `maxLag` caps how far the state may
 * trail the target (px): a fast fling never leaves the object a screen behind.
 */
export function springStep(s: SpringState, target: number, omega: number, dt: number, maxLag = Infinity): SpringState {
  if (!(dt > 0) || !Number.isFinite(dt)) return s;
  const e = s.x - target;
  const k = s.v + omega * e;
  const decay = Math.exp(-omega * dt);
  let x = target + (e + k * dt) * decay;
  const v = (s.v - omega * k * dt) * decay;
  if (x - target > maxLag) x = target + maxLag;
  else if (target - x > maxLag) x = target - maxLag;
  return { x, v };
}

/** At rest on the target: nothing left to render. */
export function isSettled(s: SpringState, target: number, eps = 0.25): boolean {
  return Math.abs(s.x - target) < eps && Math.abs(s.v) < eps * 4;
}
