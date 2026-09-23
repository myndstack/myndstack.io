/**
 * Adaptive quality for the Core's canvas: if frames stay slow, shed load.
 * Level 0 = full field; 1 = half the particles; 2 = no particles or glow.
 * Degrade-only within a page view — flapping between levels looks worse than
 * staying a notch lower. Pure reducer; the canvas feeds it frame times.
 */

export type QualityState = {
  readonly level: 0 | 1 | 2;
  /** When the current run of slow frames began (ms), or -1. */
  readonly slowSince: number;
  /** Exponential moving average of frame time (ms). */
  readonly avg: number;
};

export const INITIAL_QUALITY: QualityState = { level: 0, slowSince: -1, avg: 16.7 };

/** Average frame time above this is "slow". */
const SLOW_MS = 20;
/** Sustained for this long, drop a level. */
const SUSTAIN_MS = 2000;
/** EMA weight: ~10 frames, so one long frame (GC, tab switch) is ignored. */
const ALPHA = 0.1;

export function nextQuality(state: QualityState, frameMs: number, nowMs: number): QualityState {
  if (state.level === 2) return state;
  const avg = state.avg + (Math.min(frameMs, 100) - state.avg) * ALPHA;
  if (avg <= SLOW_MS) return { level: state.level, slowSince: -1, avg };
  const slowSince = state.slowSince < 0 ? nowMs : state.slowSince;
  if (nowMs - slowSince >= SUSTAIN_MS) {
    return { level: (state.level + 1) as 1 | 2, slowSince: -1, avg: 16.7 };
  }
  return { level: state.level, slowSince, avg };
}
