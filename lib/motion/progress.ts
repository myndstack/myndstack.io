/**
 * Scroll → progress maths for the landing chapters. Pure: every input is a
 * cached number (geometry is measured outside the scroll frame), so a frame
 * never reads layout — see AGENTS.md on lib/scroll.ts.
 */

export type ChapterGeometry = {
  /** Document-absolute top of the chapter, in px. */
  readonly top: number;
  /** The chapter's rendered height, in px. */
  readonly height: number;
  /** Viewport height at measure time, in px. */
  readonly vh: number;
};

/**
 * - `pinned`: progress across the sticky run — from the chapter's top reaching
 *   the top of the viewport to its bottom reaching the bottom (height − vh px).
 * - `pass`: progress across the chapter's whole trip through the viewport —
 *   used on phones, where nothing is pinned.
 */
export type ProgressRange = "pinned" | "pass";

export const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

export function chapterProgress(y: number, geom: ChapterGeometry, range: ProgressRange): number {
  if (range === "pinned") {
    const run = geom.height - geom.vh;
    if (run <= 0) return y >= geom.top ? 1 : 0;
    return clamp01((y - geom.top) / run);
  }
  const run = geom.height + geom.vh;
  if (run <= 0) return 0;
  return clamp01((y + geom.vh - geom.top) / run);
}

/** Progress within the sub-window [start, end] of a larger progress. */
export function segment(p: number, start: number, end: number): number {
  if (end <= start) return p >= start ? 1 : 0;
  return clamp01((p - start) / (end - start));
}

/** Index of the last stop that `p` has reached (stops ascending, first ≤ 0). */
export function activeIndex(p: number, stops: readonly number[]): number {
  let index = 0;
  for (let i = 0; i < stops.length; i++) {
    if (p >= stops[i]) index = i;
  }
  return index;
}

/** Snap to a grid of `step` so sub-pixel scroll noise doesn't cause a re-seek. */
export function quantize(p: number, step: number): number {
  return Math.round(p / step) * step;
}
