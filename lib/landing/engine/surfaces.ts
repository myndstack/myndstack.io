/**
 * Surfaces (ink, graphite, paper) as the engine sees them. CSS paints every
 * section background and seam; the engine only needs to know where paper is,
 * because it renders metal over dark surfaces and a blueprint over paper,
 * split exactly at the paper's edge (the scan line).
 *
 * Bands are measured once (ResizeObserver) in document px; paperMask() turns
 * them into at most two edges inside the canvas window each frame — pure
 * arithmetic on cached numbers, no layout reads.
 */
import type { SurfaceBand, SurfaceKind } from "./types";

/** Sorted, gap-free bands: gaps take the kind above, overlaps are clipped, same-kind neighbours merge. */
export function toBands(sections: readonly SurfaceBand[]): SurfaceBand[] {
  const sorted = sections.filter((s) => s.bottom > s.top).sort((a, b) => a.top - b.top);
  const bands: { top: number; bottom: number; kind: SurfaceKind }[] = [];
  for (const s of sorted) {
    const prev = bands[bands.length - 1];
    if (!prev) {
      bands.push({ ...s });
      continue;
    }
    const top = Math.max(s.top, prev.bottom);
    if (s.bottom <= top) continue;
    if (top > prev.bottom) prev.bottom = top;
    if (s.kind === prev.kind) prev.bottom = s.bottom;
    else bands.push({ top, bottom: s.bottom, kind: s.kind });
  }
  return bands;
}

export type PaperMask = {
  /** Whether the window's top row is on paper. */
  readonly topPaper: boolean;
  /** How many paper edges were written to `out` (window-relative CSS px, top to bottom). */
  readonly edges: number;
};

/**
 * The paper mask for a window of the page (`windowTop` document px, `height`
 * CSS px): whether its top is paper, plus up to `out.length` y positions where
 * paper starts or stops. The shader starts from `topPaper` and toggles at each
 * edge; ink ↔ graphite boundaries aren't edges (the engine looks the same on both).
 */
export function paperMask(bands: readonly SurfaceBand[], windowTop: number, height: number, out: Float32Array): PaperMask {
  const bottom = windowTop + height;
  let topPaper = false;
  let edges = 0;
  let prevPaper: boolean | null = null;
  for (const band of bands) {
    if (band.bottom <= windowTop) {
      prevPaper = band.kind === "paper";
      continue;
    }
    if (band.top >= bottom) break;
    const paper = band.kind === "paper";
    if (band.top <= windowTop) {
      topPaper = paper;
    } else if (prevPaper !== null && paper !== prevPaper && edges < out.length) {
      out[edges] = band.top - windowTop;
      edges += 1;
    } else if (prevPaper === null && paper && edges < out.length) {
      // The first band starts inside the window: whatever is above it is not paper.
      out[edges] = band.top - windowTop;
      edges += 1;
    }
    prevPaper = paper;
  }
  return { topPaper, edges };
}

/** CSS px → an integer device row; `flip` for WebGL's bottom-left origin. */
export function toDeviceY(cssY: number, dpr: number, deviceHeight: number, flip: boolean): number {
  const row = Math.round(cssY * dpr);
  return flip ? deviceHeight - row : row;
}
