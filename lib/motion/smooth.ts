/**
 * The "glide" behind the smoothed scrub: the displayed timeline position eases
 * toward the scroll-derived target instead of snapping to it. Pure functions,
 * driven from one anime timer that pauses itself once settled (so a still page
 * costs nothing and writes nothing).
 */

/**
 * Exponential approach: after `dtMs`, the remaining distance is multiplied by
 * exp(−dt/τ). Composes exactly — two 8ms steps equal one 16ms step — so the
 * feel doesn't change with the display's refresh rate.
 */
export function smoothToward(current: number, target: number, dtMs: number, tauMs: number): number {
  if (tauMs <= 0) return target;
  return target + (current - target) * Math.exp(-dtMs / tauMs);
}

/**
 * Never let the display trail the target by more than `maxLag`. A long smooth
 * scroll (anchor jump, PageDown with `scroll-behavior: smooth`) then reads as
 * a quick catch-up, not a slow drift through several chapters.
 */
export function clampLag(current: number, target: number, maxLag: number): number {
  if (current < target - maxLag) return target - maxLag;
  if (current > target + maxLag) return target + maxLag;
  return current;
}

/** Frame delta, clamped: a background tab resuming must not teleport. */
export function clampDt(dtMs: number, maxMs = 50): number {
  if (!(dtMs > 0)) return 0;
  return dtMs > maxMs ? maxMs : dtMs;
}

export type GlideOptions = {
  readonly tauMs: number;
  /** Within this distance the glide snaps to the target and reports settled. */
  readonly eps: number;
  readonly maxLag: number;
};

export function glideStep(
  current: number,
  target: number,
  dtMs: number,
  { tauMs, eps, maxLag }: GlideOptions,
): { value: number; settled: boolean } {
  const next = smoothToward(clampLag(current, target, maxLag), target, dtMs, tauMs);
  if (Math.abs(target - next) <= eps) return { value: target, settled: true };
  return { value: next, settled: false };
}

/** A scroll that moved more than a viewport in one frame is a jump: snap. */
export function isJump(prevY: number, y: number, vh: number): boolean {
  return Math.abs(y - prevY) > vh;
}
