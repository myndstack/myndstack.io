/**
 * The landing's one frame and grid, as numbers. CSS draws it (the rails,
 * `.ms-grid`, the safe zones in components/landing/styles/frame.css); the
 * engine places itself on it — so the object lands on the same columns as the
 * copy beside it, at every viewport, with nothing measured.
 *
 * - Frame: at most 1600px, centred. Rails inset clamp(24px, 100vw/30, 48px)
 *   from its edges (from 1000px wide; below that there are no rails).
 * - Content box: the rails inset 24px — 72 → 1368 at 1440. 12 columns with
 *   24px gutters; 8 on tablets (24px margins, 20px gutters); 4 on phones.
 * - Pinned safe area: 96px under the nav, 72px over the title block.
 */
import type { Box } from "./types";

export const FRAME_MAX = 1600;
export const SAFE_TOP = 96;
export const SAFE_BOTTOM = 72;
/** Content box inset from a rail. */
const RAIL_GAP = 24;

export type Grid = {
  readonly vw: number;
  readonly vh: number;
  readonly columns: 4 | 8 | 12;
  readonly gap: number;
  /** Column width. */
  readonly col: number;
  /** Content box, left and right. */
  readonly x0: number;
  readonly x1: number;
  /** Pinned safe area, top and bottom. */
  readonly y0: number;
  readonly y1: number;
  /** Rail x positions; null below 1000px. */
  readonly rails: readonly [number, number] | null;
};

export function grid(vw: number, vh: number): Grid {
  const y0 = SAFE_TOP;
  const y1 = vh - SAFE_BOTTOM;
  if (vw < 760) return columns(vw, vh, 4, 20, vw - 20, 16, y0, y1, null);
  if (vw < 1000) return columns(vw, vh, 8, 24, vw - 24, 20, y0, y1, null);
  const frame = Math.min(vw, FRAME_MAX);
  const left = (vw - frame) / 2;
  const inset = Math.min(48, Math.max(24, vw / 30));
  const rails: [number, number] = [left + inset, left + frame - inset];
  return columns(vw, vh, 12, rails[0] + RAIL_GAP, rails[1] - RAIL_GAP, 24, y0, y1, rails);
}

function columns(
  vw: number,
  vh: number,
  n: 4 | 8 | 12,
  x0: number,
  x1: number,
  gap: number,
  y0: number,
  y1: number,
  rails: readonly [number, number] | null,
): Grid {
  return { vw, vh, columns: n, gap, col: (x1 - x0 - (n - 1) * gap) / n, x0, x1, y0, y1, rails };
}

/** Left edge of column `c` (1-based). */
export function colLeft(g: Grid, c: number): number {
  return g.x0 + (c - 1) * (g.col + g.gap);
}

/** Right edge of column `c` (1-based). */
export function colRight(g: Grid, c: number): number {
  return colLeft(g, c) + g.col;
}

/**
 * A box on the grid: whole columns (designed on 12), and rows as fractions
 * of the viewport height (default: the safe area). On fewer columns there is
 * no pinned composition to keep, so a box is the whole content width.
 */
export type BoxSpec = {
  readonly cols: readonly [number, number];
  readonly rows?: readonly [number, number];
};

export function boxOf(g: Grid, spec: BoxSpec): Box {
  const [c0, c1] = g.columns === 12 ? spec.cols : [1, g.columns];
  const x = colLeft(g, c0);
  const y = spec.rows ? spec.rows[0] * g.vh : g.y0;
  const bottom = spec.rows ? spec.rows[1] * g.vh : g.y1;
  return { x, y, w: colRight(g, c1) - x, h: bottom - y };
}
