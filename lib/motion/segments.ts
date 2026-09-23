/**
 * Scroll → timeline time for a multi-segment scrubbed run (the Core runs).
 *
 * A run's master timeline gives every segment the same length, SEGMENT_UNIT,
 * with a label at each boundary. Scroll, though, is not uniform: the hero is
 * one screen, the dive two, a capability article a screen and a bit. So each
 * segment's *scroll* range comes from where its `[data-segment]` element
 * actually sits (cached offsets, measured outside the scroll frame), and this
 * maps a scroll position into the uniform timeline. Pure arithmetic — safe to
 * call from a scroll frame.
 */

/** Timeline length of one segment. Labels sit at multiples of this. */
export const SEGMENT_UNIT = 1000;

export type RunGeometry = {
  /** Document-absolute top of the run, in px. */
  readonly top: number;
  /**
   * Scroll offset (relative to `top`) at which each segment starts, ascending.
   * The first may be negative: an "enter" segment that plays while the run is
   * still rising into view.
   */
  readonly stops: readonly number[];
  /** Offset (relative to `top`) at which the last segment ends. */
  readonly end: number;
};

/** Timeline time for scroll position `y`, in [0, stops.length × UNIT]. */
export function segmentTime(y: number, run: RunGeometry): number {
  const rel = y - run.top;
  const { stops, end } = run;
  const n = stops.length;
  if (n === 0 || rel <= stops[0]) return 0;
  if (rel >= end) return n * SEGMENT_UNIT;

  for (let i = n - 1; i >= 0; i--) {
    const start = stops[i];
    if (rel < start) continue;
    const stop = i + 1 < n ? stops[i + 1] : end;
    const span = stop - start;
    // A zero-length segment (two boundaries at the same offset) is jumped over.
    if (span <= 0) return (i + 1) * SEGMENT_UNIT;
    return (i + Math.min(1, (rel - start) / span)) * SEGMENT_UNIT;
  }
  return 0;
}

/** Which segment a time falls in, and how far through it (0–1). */
export function segmentAt(time: number, count: number): { index: number; local: number } {
  if (count <= 0 || time <= 0) return { index: 0, local: 0 };
  const total = count * SEGMENT_UNIT;
  if (time >= total) return { index: count - 1, local: 1 };
  const index = Math.floor(time / SEGMENT_UNIT);
  return { index, local: (time - index * SEGMENT_UNIT) / SEGMENT_UNIT };
}
