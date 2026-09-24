/**
 * Technical drawings of the engine, from the same profiles as the 3D model —
 * the posters every non-face pose falls back to (no JS, reduced motion, the
 * poster tier, print). Face poses use the CoreRing SVG itself.
 *
 * Orthographic, from any direction: `axis` is the engine's axis in camera
 * space (x right, y up, z toward the viewer — axisInCamera(pose)). Each module
 * is drawn as its rims (ellipses), the silhouette walls joining them, its bore
 * and hue inlay; back rims' far halves and rims covered by a seated, wider
 * neighbour are dashed; a dash-dot centreline runs through it all. On request:
 * the gear's teeth, the face's five arcs, a dimension line and the tools'
 * ports. Pure: path data in poster units (world × 100, y down) and a viewBox
 * that frames the drawing at `fill`, for the server component to render.
 */
import { CORE } from "@/lib/motion/core-geometry";

import { BEZEL, FLANGE, GEAR, HOUSING, INTERFACE, moduleZ } from "./geometry/index";

/** Poster units per world unit. */
export const POSTER_UNIT = 100;

/** `body` is a band's filled silhouette (painted back to front, it hides what's behind it). */
export type PathKind = "body" | "outline" | "hidden" | "centre" | "bore" | "inlay" | "arc" | "tooth" | "shaft" | "dim" | "port";

export type PosterPath = {
  readonly d: string;
  readonly kind: PathKind;
  /** Module index (0 face … 4 data); -1 for the centreline, shaft and dimension line. */
  readonly module: number;
  /** ARCS hue index, for inlays and arcs. */
  readonly hue?: number;
};

export type DrawView = {
  /** The engine's axis in camera space (need not be normalised). */
  readonly axis: readonly [number, number, number];
  /** Global explode, 0 → 1. */
  readonly explode: number;
  /** Share of the viewBox the drawing fills (it is centred). */
  readonly fill?: number;
  /** Per-module offset perpendicular to the axis, world units (the studio's agency state). */
  readonly shift?: readonly number[];
  /** Per-module extra distance back along the axis, world units. */
  readonly gap?: readonly number[];
  /** Per-module roll in the picture plane, degrees about the module's centre. */
  readonly roll?: readonly number[];
  readonly teeth?: boolean;
  readonly arcs?: boolean;
  readonly dims?: boolean;
  readonly ports?: boolean;
};

export type Point2 = { readonly x: number; readonly y: number };
export type Anchor = Point2 & { readonly module: number };

export type Drawing = {
  /** [minX, minY, width, height] in poster units. */
  readonly viewBox: readonly [number, number, number, number];
  readonly paths: readonly PosterPath[];
  /** Per module, face first: the midpoint of its right-hand silhouette (label anchors). */
  readonly anchors: readonly Anchor[];
  /** With `ports`: points on the left-hand profile for models, compute, data, then the shaft's end (-1). */
  readonly ports: readonly Anchor[];
};

type Band = { readonly r: number; readonly top: number; readonly bottom: number };
type Part = { readonly bands: readonly Band[]; readonly bore: number; readonly inlay: number; readonly hue: number };

const maxR = (profile: readonly { readonly r: number }[]) => Math.max(...profile.map((p) => p.r));

/** Face radius 2.1 is CORE's 500: the arcs' radius in world units. */
const R_ARC = (CORE.rArc / (CORE.size / 2)) * 2.1;
const SHAFT_R = 0.16;
/** Neighbours closer than this along the axis are seated (their facing rims touch). */
const SEATED = 0.06;

/** Outline, bore, inlay and hue per module (face first), from the 3D profiles. */
const PARTS: readonly Part[] = [
  { bands: [{ r: maxR(BEZEL), top: 0.22, bottom: -0.3 }], bore: 1.98, inlay: 0, hue: 3 },
  { bands: [{ r: maxR(INTERFACE), top: 0.3, bottom: -0.3 }], bore: 1.62, inlay: 1.78, hue: 2 },
  { bands: [{ r: maxR(HOUSING), top: 0.5, bottom: -0.5 }], bore: 0.95, inlay: 1.42, hue: 1 },
  // The gear's teeth over its hub's thickness (the hub is what seats).
  { bands: [{ r: GEAR.tip, top: 0.3, bottom: -0.3 }], bore: 1.12, inlay: 1.2, hue: 4 },
  {
    bands: [
      { r: maxR(FLANGE), top: 0.25, bottom: -0.25 },
      { r: 0.62, top: -0.25, bottom: -1.1 },
    ],
    bore: 0,
    inlay: 1.82,
    hue: 0,
  },
];

type V = { x: number; y: number };
const add = (a: V, b: V): V => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: V, b: V): V => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: V, k: number): V => ({ x: a.x * k, y: a.y * k });
const rot = (a: V, deg: number): V => {
  const c = Math.cos((deg * Math.PI) / 180);
  const s = Math.sin((deg * Math.PI) / 180);
  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c };
};
/** Poster units are 1/100 of a world unit — well under a pixel at any poster size — so integers suffice. */
const f1 = (n: number) => (Math.round(n) || 0).toString();

/** A module's frame in the picture plane (math coords, y up, world units). */
type Frame = {
  /** Projected axis direction (unit) and perpendicular (d turned clockwise). */
  readonly d: V;
  readonly p: V;
  /** Picture-plane point for axial `t`, perpendicular `s`. */
  readonly at: (t: number, s: number) => V;
};

/** Everything drawn, in math coords (world units, y up), for the bbox and the SVG. */
type Ellipse = { c: V; a: V; b: V };

export function drawEngine(view: DrawView): Drawing {
  const [ax, ay, az0] = view.axis;
  const len = Math.hypot(ax, ay, az0) || 1;
  const fore = Math.hypot(ax, ay) / len;
  const az = az0 / len;
  const d0: V = fore > 1e-6 ? { x: ax / len / fore, y: ay / len / fore } : { x: 0, y: 1 };
  const p0: V = { x: d0.y, y: -d0.x };
  /** +1 when the face end (+z) is toward the viewer. */
  const facing = az >= 0 ? 1 : -1;
  const squash = Math.abs(az);

  const zOf = (k: number) => moduleZ(k, view.explode) - (view.gap?.[k] ?? 0);
  const frames: Frame[] = PARTS.map((part, k) => {
    const z = zOf(k);
    const mid = z + (part.bands[0].top + part.bands[0].bottom) / 2;
    const shift = view.shift?.[k] ?? 0;
    const roll = view.roll?.[k] ?? 0;
    const centre = add(mul(d0, mid * fore), mul(p0, shift));
    const d = rot(d0, roll);
    const p = rot(p0, roll);
    return {
      d,
      p,
      at: (t, s) => add(centre, add(mul(d, (z + t - mid) * fore), mul(p, s))),
    };
  });

  const ellipse = (k: number, t: number, r: number): Ellipse => {
    const fr = frames[k];
    return { c: fr.at(t, 0), a: mul(fr.p, r), b: mul(fr.d, r * squash) };
  };

  // ---- Emit, in math coords; converted to SVG strings at the end ----------------
  type Item =
    | { kind: PathKind; module: number; hue?: number; e: Ellipse; part: "full" | "near" | "far" }
    | { kind: PathKind; module: number; hue?: number; e: Ellipse; arc: readonly [number, number] }
    | { kind: PathKind; module: number; hue?: number; lines: readonly (readonly [V, V])[] }
    | { kind: PathKind; module: number; hue?: number; circle: { c: V; r: number } }
    | { kind: PathKind; module: number; hue?: number; near: Ellipse; far: Ellipse };
  const items: Item[] = [];

  // Bands front (toward the viewer) to back, for occlusion between neighbours.
  const bands = PARTS.flatMap((part, k) => part.bands.map((band, j) => ({ k, j, band, part })));
  const top = (b: (typeof bands)[number]) => zOf(b.k) + b.band.top;
  const bottom = (b: (typeof bands)[number]) => zOf(b.k) + b.band.bottom;
  bands.sort((a, b) => (facing > 0 ? top(b) - top(a) : bottom(a) - bottom(b)));

  // Hidden lines first: every body painted after them covers them (a
  // translucent body lets them show faintly, as on a drawing).
  const covered = bands.map((b, i) => {
    const cover = bands[i - 1];
    if (!cover) return false;
    const gap = facing > 0 ? bottom(cover) - top(b) : bottom(b) - top(cover);
    return gap < SEATED && cover.band.r >= b.band.r - 1e-6;
  });
  const rims = bands.map(({ k, band }) => ({
    near: ellipse(k, facing > 0 ? band.top : band.bottom, band.r),
    far: ellipse(k, facing > 0 ? band.bottom : band.top, band.r),
  }));
  bands.forEach(({ k }, i) => {
    items.push({ kind: "hidden", module: k, e: rims[i].far, part: "far" });
    if (covered[i]) items.push({ kind: "hidden", module: k, e: rims[i].near, part: "full" });
  });

  // Shaft: only in the open gaps between modules (it's hidden inside them).
  const axisAt = (t: number, s: number): V => add(mul(d0, t * fore), mul(p0, s));
  if (fore > 1e-3) {
    const shaft: (readonly [V, V])[] = [];
    for (let k = 0; k < 4; k++) {
      const from = zOf(k) + PARTS[k].bands[0].bottom;
      const to = zOf(k + 1) + PARTS[k + 1].bands[0].top;
      if (from - to > SEATED) {
        for (const s of [-SHAFT_R, SHAFT_R]) shaft.push([axisAt(from, s), axisAt(to, s)]);
      }
    }
    if (shaft.length) items.push({ kind: "shaft", module: -1, lines: shaft });
  }

  // Then each band back to front (painter's order): its body, then its lines.
  for (let i = bands.length - 1; i >= 0; i--) {
    const { k, j, band, part } = bands[i];
    const { near, far } = rims[i];
    items.push({ kind: "body", module: k, near, far });
    if (!covered[i]) items.push({ kind: "outline", module: k, e: near, part: "full" });
    items.push({ kind: "outline", module: k, e: far, part: "near" });
    items.push({
      kind: "outline",
      module: k,
      lines: [
        [sub(near.c, near.a), sub(far.c, far.a)],
        [add(near.c, near.a), add(far.c, far.a)],
      ],
    });
    if (j !== 0 || covered[i]) continue;
    const tNear = facing > 0 ? band.top : band.bottom;
    if (part.bore > 0) items.push({ kind: "bore", module: k, e: ellipse(k, tNear, part.bore), part: "full" });
    if (part.inlay > 0) items.push({ kind: "inlay", module: k, hue: part.hue, e: ellipse(k, tNear, part.inlay), part: "full" });
    if (k === 3 && view.teeth) {
      const lines: (readonly [V, V])[] = [];
      for (let n = 0; n < GEAR.teeth; n++) {
        const th = (2 * Math.PI * n) / GEAR.teeth;
        const u = add(mul(near.a, Math.cos(th) / band.r), mul(near.b, Math.sin(th) / band.r));
        lines.push([add(near.c, mul(u, GEAR.root)), add(near.c, mul(u, GEAR.tip))]);
      }
      items.push({ kind: "tooth", module: 3, lines });
    }
    if (k === 0 && view.arcs && facing > 0) {
      CORE.arcs.forEach((arc, hue) => {
        items.push({ kind: "arc", module: 0, hue, e: ellipse(0, tNear, R_ARC), arc: [arc.a0, arc.a1] });
      });
    }
  }

  const tMax = zOf(0) + PARTS[0].bands[0].top;
  const tMin = zOf(4) + PARTS[4].bands[1].bottom;
  const rMax = Math.max(...PARTS.flatMap((p) => p.bands.map((b) => b.r)));
  if (fore > 1e-3) {
    items.push({ kind: "centre", module: -1, lines: [[axisAt(tMax + 0.45, 0), axisAt(tMin - 0.45, 0)]] });
  }

  // Anchors: each module's right-hand silhouette at mid-height.
  const anchorsMath = PARTS.map((part, k) => {
    const band = part.bands[0];
    const e = ellipse(k, (band.top + band.bottom) / 2, band.r);
    const [l, r] = [sub(e.c, e.a), add(e.c, e.a)];
    return { module: k, left: l.x < r.x ? l : r, right: l.x < r.x ? r : l };
  });

  if (view.dims && fore > 1e-3) {
    const side = p0.x >= 0 ? 1 : -1;
    const s = side * (rMax + 0.45);
    const ticks: (readonly [V, V])[] = [[axisAt(tMax, s), axisAt(tMin, s)]];
    for (const b of bands) {
      for (const t of [top(b), bottom(b)]) ticks.push([axisAt(t, s - side * 0.12), axisAt(t, s + side * 0.12)]);
    }
    items.push({ kind: "dim", module: -1, lines: ticks });
  }

  const portsMath: { module: number; c: V }[] = [];
  if (view.ports) {
    for (const k of [2, 3, 4]) portsMath.push({ module: k, c: anchorsMath[k].left });
    portsMath.push({ module: -1, c: axisAt(tMin - 0.2, 0) });
    for (const port of portsMath) items.push({ kind: "port", module: port.module, circle: { c: port.c, r: 0.12 } });
  }

  // ---- Bounds and the viewBox ------------------------------------------------------
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const grow = (x0: number, x1: number, y0: number, y1: number) => {
    minX = Math.min(minX, x0);
    maxX = Math.max(maxX, x1);
    minY = Math.min(minY, y0);
    maxY = Math.max(maxY, y1);
  };
  for (const it of items) {
    if ("e" in it) {
      const hx = Math.hypot(it.e.a.x, it.e.b.x);
      const hy = Math.hypot(it.e.a.y, it.e.b.y);
      grow(it.e.c.x - hx, it.e.c.x + hx, it.e.c.y - hy, it.e.c.y + hy);
    } else if ("near" in it) {
      continue; // inside its rims' ellipses, which are items of their own
    } else if ("lines" in it) {
      for (const [a, b] of it.lines) grow(Math.min(a.x, b.x), Math.max(a.x, b.x), Math.min(a.y, b.y), Math.max(a.y, b.y));
    } else {
      grow(it.circle.c.x - it.circle.r, it.circle.c.x + it.circle.r, it.circle.c.y - it.circle.r, it.circle.c.y + it.circle.r);
    }
  }
  const fill = view.fill ?? 0.9;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const w = ((maxX - minX) / fill) * POSTER_UNIT;
  const h = ((maxY - minY) / fill) * POSTER_UNIT;
  const U = POSTER_UNIT;
  const X = (v: V) => v.x * U;
  const Y = (v: V) => -v.y * U;
  const pt = (v: V) => `${f1(X(v))} ${f1(Y(v))}`;

  // ---- SVG path data ----------------------------------------------------------
  const arcCmd = (e: Ellipse, to: V, large: 0 | 1, sweep: 0 | 1) => {
    const phi = (Math.atan2(-e.a.y, e.a.x) * 180) / Math.PI;
    const ry = Math.hypot(e.b.x, e.b.y) * U;
    return `A${f1(Math.hypot(e.a.x, e.a.y) * U)} ${f1(ry)} ${f1(phi)} ${large} ${sweep} ${pt(to)}`;
  };
  /** Sweep flag for an SVG arc from `a` through `m` to `b` (screen clockwise = 1). */
  const sweepOf = (a: V, m: V, b: V): 0 | 1 => {
    const [ax1, ay1, mx, my, bx, by] = [X(a), Y(a), X(m), Y(m), X(b), Y(b)];
    return (mx - ax1) * (by - my) - (my - ay1) * (bx - mx) > 0 ? 1 : 0;
  };
  const flat = (e: Ellipse) => Math.hypot(e.b.x, e.b.y) * U < 0.5;

  const pathOf = (it: Item): string => {
    if ("near" in it) {
      // Far rim's outer half, a wall, the near rim's outer half, the other wall.
      const { near, far } = it;
      const [FL, FR, NL, NR] = [sub(far.c, far.a), add(far.c, far.a), sub(near.c, near.a), add(near.c, near.a)];
      if (flat(far)) return `M${pt(FL)}L${pt(FR)}L${pt(NR)}L${pt(NL)}Z`;
      const fm = sub(far.c, mul(far.b, facing));
      const nm = add(near.c, mul(near.b, facing));
      return `M${pt(FL)}${arcCmd(far, FR, 0, sweepOf(FL, fm, FR))}L${pt(NR)}${arcCmd(near, NL, 0, sweepOf(NR, nm, NL))}Z`;
    }
    if ("lines" in it) return it.lines.map(([a, b]) => `M${pt(a)}L${pt(b)}`).join("");
    if ("circle" in it) {
      const { c, r } = it.circle;
      const l = { x: c.x - r, y: c.y };
      const rr = { x: c.x + r, y: c.y };
      const R = f1(r * U);
      return `M${pt(l)}A${R} ${R} 0 1 0 ${pt(rr)}A${R} ${R} 0 1 0 ${pt(l)}Z`;
    }
    const e = it.e;
    const L = sub(e.c, e.a);
    const R = add(e.c, e.a);
    if ("arc" in it) {
      // CORE angles run clockwise from 12; 12 o'clock is the +d side of the rim.
      const [a0, a1] = it.arc;
      const pAt = (deg: number) => {
        const th = ((90 - deg) * Math.PI) / 180;
        return add(e.c, add(mul(e.a, Math.cos(th)), mul(e.b, Math.sin(th))));
      };
      const s = pAt(a0);
      const m = pAt((a0 + a1) / 2);
      const t = pAt(a1);
      return flat(e) ? `M${pt(s)}L${pt(t)}` : `M${pt(s)}${arcCmd(e, t, a1 - a0 > 180 ? 1 : 0, sweepOf(s, m, t))}`;
    }
    if (flat(e)) return it.part === "far" ? "" : `M${pt(L)}L${pt(R)}`;
    if (it.part === "full") {
      const m = add(e.c, e.b);
      const sw = sweepOf(L, m, R);
      return `M${pt(L)}${arcCmd(e, R, 0, sw)}${arcCmd(e, L, 0, sw)}`;
    }
    // Near half: the side away from the face end when it faces us (and vice versa).
    const sign = (it.part === "near" ? -1 : 1) * facing;
    const m = add(e.c, mul(e.b, sign));
    return `M${pt(L)}${arcCmd(e, R, 0, sweepOf(L, m, R))}`;
  };

  const paths: PosterPath[] = [];
  for (const it of items) {
    const d = pathOf(it);
    if (d) paths.push(it.hue === undefined ? { d, kind: it.kind, module: it.module } : { d, kind: it.kind, module: it.module, hue: it.hue });
  }
  const toPoster = (v: V): Point2 => ({ x: Math.round(X(v) * 10) / 10, y: Math.round(Y(v) * 10) / 10 });

  return {
    viewBox: [
      Math.round((cx * U - w / 2) * 10) / 10,
      Math.round((-cy * U - h / 2) * 10) / 10,
      Math.round(w * 10) / 10,
      Math.round(h * 10) / 10,
    ],
    paths,
    anchors: anchorsMath.map((a) => ({ module: a.module, ...toPoster(a.right) })),
    ports: portsMath.map((port) => ({ module: port.module, ...toPoster(port.c) })),
  };
}
