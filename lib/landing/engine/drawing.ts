/**
 * Technical drawings of the engine, from the same profiles as the 3D model —
 * the posters every non-face pose falls back to (no JS, reduced motion, low
 * tiers, print). Face poses use the CoreRing SVG itself.
 *
 * Orthographic, axis vertical (the TOWER / ELEV poses): each module is drawn
 * as its rims (ellipses seen from `pitch` degrees above), the silhouette walls
 * joining them, its hue inlay, and a dash-dot centreline — ink on paper, or
 * light construction lines on dark. Pure: returns path data for the server
 * component to render (1000 × 1000 viewBox).
 */
import {
  BEZEL,
  FLANGE,
  HOUSING,
  INTERFACE,
  moduleZ,
  type Lod,
} from "./geometry/index";

export const POSTER_VIEW = 1000;

export type PosterPath = {
  readonly d: string;
  /** outline = visible edge, hidden = dashed back edge, centre = dash-dot axis, inlay = hue ring. */
  readonly kind: "outline" | "hidden" | "centre" | "inlay";
  /** Module index (0 face … 4 data), for focus styling; -1 for the centreline. */
  readonly module: number;
  /** ARCS hue index for inlays. */
  readonly hue?: number;
};

export type Poster = { readonly paths: readonly PosterPath[] };

/** Outer radius, top and bottom (local z), inlay radius and hue per module (face first). */
const OUTLINE = [
  { r: Math.max(...BEZEL.map((p) => p.r)), top: 0.22, bottom: -0.3, hole: 0, inlay: 0, hue: 3 },
  { r: Math.max(...INTERFACE.map((p) => p.r)), top: 0.3, bottom: -0.3, hole: 1.62, inlay: 1.78, hue: 2 },
  { r: Math.max(...HOUSING.map((p) => p.r)), top: 0.5, bottom: -0.5, hole: 0.95, inlay: 1.42, hue: 1 },
  { r: 1.9, top: 0.3, bottom: -0.3, hole: 1.12, inlay: 1.2, hue: 4 },
  { r: Math.max(...FLANGE.map((p) => p.r)), top: 0.25, bottom: -0.25, hole: 0.62, inlay: 1.82, hue: 0 },
] as const;

const f = (n: number) => (Math.round(n * 10) / 10).toString();

/** Half an ellipse (front: the lower half, nearer the viewer) or the whole of it. */
function ellipse(cx: number, cy: number, rx: number, ry: number, part: "full" | "front" | "back"): string {
  if (ry < 0.05) {
    // Seen edge-on: a straight line.
    return `M${f(cx - rx)} ${f(cy)}H${f(cx + rx)}`;
  }
  const L = `${f(cx - rx)} ${f(cy)}`;
  const R = `${f(cx + rx)} ${f(cy)}`;
  const arc = (sweep: 0 | 1, to: string) => `A${f(rx)} ${f(ry)} 0 0 ${sweep} ${to}`;
  if (part === "front") return `M${L}${arc(0, R)}`;
  if (part === "back") return `M${L}${arc(1, R)}`;
  return `M${L}${arc(0, R)}${arc(0, L)}`;
}

export type TowerOptions = {
  /** Explode, 0 → 1. */
  readonly explode: number;
  /** Camera elevation in degrees (TOWER ≈ 22, ELEV ≈ 2). */
  readonly pitch: number;
  /** Fraction of the view the drawing may fill (it is centred). */
  readonly fill?: number;
};

/**
 * The tower seen from `pitch` degrees above: rims, walls and inlays per module,
 * the shaft's centreline, scaled to fill the view.
 */
export function towerPoster({ explode, pitch, fill = 0.9 }: TowerOptions): Poster {
  const el = (pitch * Math.PI) / 180;
  const sin = Math.sin(el);
  const cos = Math.cos(el);
  // Module bands in world units (axis up).
  const bands = OUTLINE.map((o, k) => ({ ...o, k, y: moduleZ(k, explode) }));
  const top = Math.max(...bands.map((b) => (b.y + b.top) * cos + b.r * sin));
  const bottom = Math.min(...bands.map((b) => (b.y + b.bottom) * cos - b.r * sin));
  const width = Math.max(...bands.map((b) => b.r)) * 2;
  const scale = (fill * POSTER_VIEW) / Math.max(width, top - bottom);
  const cx = POSTER_VIEW / 2;
  const mid = (top + bottom) / 2;
  const Y = (y: number) => POSTER_VIEW / 2 - (y - mid) * scale;

  const paths: PosterPath[] = [];
  paths.push({ d: `M${f(cx)} ${f(Y(top) - 20)}V${f(Y(bottom) + 20)}`, kind: "centre", module: -1 });
  for (const b of bands) {
    const rx = b.r * scale;
    const ry = b.r * sin * scale;
    const yTop = Y((b.y + b.top) * cos);
    const yBottom = Y((b.y + b.bottom) * cos);
    // Top rim fully visible from above; the bottom rim's back half is hidden.
    paths.push({ d: ellipse(cx, yTop, rx, ry, "full"), kind: "outline", module: b.k });
    paths.push({ d: ellipse(cx, yBottom, rx, ry, "front"), kind: "outline", module: b.k });
    paths.push({ d: ellipse(cx, yBottom, rx, ry, "back"), kind: "hidden", module: b.k });
    // Silhouette walls.
    paths.push({ d: `M${f(cx - rx)} ${f(yTop)}V${f(yBottom)}M${f(cx + rx)} ${f(yTop)}V${f(yBottom)}`, kind: "outline", module: b.k });
    if (b.hole > 0) paths.push({ d: ellipse(cx, yTop, b.hole * scale, b.hole * sin * scale, "full"), kind: "outline", module: b.k });
    if (b.inlay > 0) {
      paths.push({ d: ellipse(cx, yTop, b.inlay * scale, b.inlay * sin * scale, "full"), kind: "inlay", module: b.k, hue: b.hue });
    }
  }
  return { paths };
}

/** The level-of-detail the posters are drawn from (the profiles are LOD-independent). */
export const POSTER_LOD: Lod = 0;
