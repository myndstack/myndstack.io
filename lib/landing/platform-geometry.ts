/**
 * Geometry of the Platform chapter: an isometric stack of four plates
 * (Interface → Data, top to bottom) with discipline labels whose leader lines
 * run into the plates. Computed once on the server into path strings and
 * percentage positions; motion only translates plates and draws lines
 * (pathLength=1), so nothing is measured in the browser.
 *
 * Plates are drawn at their BUILT (stacked) positions. `plateOffset` is how
 * far each sits from there when exploded — the scrub translates it home.
 */
import type { Point } from "@/lib/motion/core-geometry";

export const PLATFORM_VIEW = { w: 1000, h: 760 } as const;

/** Rhombus half-width / half-height (≈ isometric), and slab thickness. */
export const PLATE = { cx: 500, w: 220, h: 120, t: 16 } as const;

export const LAYERS = 4;

/** Built (stacked) centre y of plate `i`. */
export const plateY = (i: number): number => 262 + i * 72;

/** Exploded offset of plate `i` from its built position (px in the view). */
export const plateOffset = (i: number): number => (i - (LAYERS - 1) / 2) * 92;

const r = (n: number): number => Math.round(n * 100) / 100;

export function plateFaces(cx: number, cy: number): { top: string; left: string; right: string } {
  const { w, h, t } = PLATE;
  return {
    top: `M${r(cx - w)} ${r(cy)}L${r(cx)} ${r(cy - h)}L${r(cx + w)} ${r(cy)}L${r(cx)} ${r(cy + h)}Z`,
    left: `M${r(cx - w)} ${r(cy)}L${r(cx)} ${r(cy + h)}L${r(cx)} ${r(cy + h + t)}L${r(cx - w)} ${r(cy + t)}Z`,
    right: `M${r(cx)} ${r(cy + h)}L${r(cx + w)} ${r(cy)}L${r(cx + w)} ${r(cy + t)}L${r(cx)} ${r(cy + h + t)}Z`,
  };
}

export type LabelSpot = {
  readonly label: string;
  readonly layer: number;
  readonly side: "left" | "right";
  /** Where the label's inner edge sits (the line starts here). */
  readonly x: number;
  readonly y: number;
  /** Where its leader line lands on the plate (built position). */
  readonly end: Point;
  /** Elbow x of the leader line. */
  readonly elbow: number;
};

/** Even rows down each side of the stack. */
const ROW_TOP = 150;
const ROW_GAP = 98;
const LABEL_X = { left: 200, right: 800 } as const;
const ELBOW_X = { left: 252, right: 748 } as const;
/** Where along the plate's front edge each of a layer's lines lands. */
const EDGE_T = [0.18, 0.42, 0.66] as const;

/**
 * Layers 0 and 2 take the left column, 1 and 3 the right — so every plate's
 * lines come from one side and none of them cross.
 */
export function labelLayout(
  disciplines: readonly { readonly label: string; readonly layer: number }[],
): LabelSpot[] {
  const rows = { left: 0, right: 0 };
  const perLayer = new Map<number, number>();
  return disciplines.map(({ label, layer }) => {
    const side = layer % 2 === 0 ? "left" : "right";
    const row = rows[side]++;
    const k = perLayer.get(layer) ?? 0;
    perLayer.set(layer, k + 1);
    const t = EDGE_T[Math.min(k, EDGE_T.length - 1)];
    const cy = plateY(layer);
    const end =
      side === "left"
        ? { x: PLATE.cx - PLATE.w + PLATE.w * t, y: cy + PLATE.h * t }
        : { x: PLATE.cx + PLATE.w - PLATE.w * t, y: cy + PLATE.h * t };
    return { label, layer, side, x: LABEL_X[side], y: ROW_TOP + row * ROW_GAP, end, elbow: ELBOW_X[side] };
  });
}

/** One contour: across from the label, then down/up into the plate. */
export function leaderPath(spot: LabelSpot): string {
  return `M${r(spot.x)} ${r(spot.y)}H${r(spot.elbow)}L${r(spot.end.x)} ${r(spot.end.y)}`;
}

/** A view coordinate as a CSS percentage of the chapter's figure box. */
export const pctX = (x: number): string => `${r((x / PLATFORM_VIEW.w) * 100)}%`;
export const pctY = (y: number): string => `${r((y / PLATFORM_VIEW.h) * 100)}%`;
