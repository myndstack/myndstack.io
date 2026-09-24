/**
 * Adaptive quality: if frames stay slow, shed load one level at a time.
 * Level 0 = full; each level above sheds more (the landing engine maps
 * 0–3 to its high / medium / low / poster tiers). Degrade-only within a page
 * view — flapping between levels looks worse than staying a notch lower.
 * Pure reducer; the renderer feeds it frame times.
 */

export type QualityLevel = 0 | 1 | 2 | 3;

export type QualityState = {
  readonly level: QualityLevel;
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

/** `floor` is the lowest level this caller can shed to (default 2). */
export function nextQuality(
  state: QualityState,
  frameMs: number,
  nowMs: number,
  floor: QualityLevel = 2,
): QualityState {
  if (state.level >= floor) return state;
  const avg = state.avg + (Math.min(frameMs, 100) - state.avg) * ALPHA;
  if (avg <= SLOW_MS) return { level: state.level, slowSince: -1, avg };
  const slowSince = state.slowSince < 0 ? nowMs : state.slowSince;
  if (nowMs - slowSince >= SUSTAIN_MS) {
    return { level: (state.level + 1) as QualityLevel, slowSince: -1, avg: 16.7 };
  }
  return { level: state.level, slowSince, avg };
}
