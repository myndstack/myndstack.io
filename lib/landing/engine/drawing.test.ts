import { describe, expect, it } from "vitest";

import { drawEngine, type DrawView, type Drawing } from "./drawing";

const DEG = Math.PI / 180;
/** The axis for a camera `pitch` degrees above a vertical engine (TOWER / ELEV). */
const upright = (pitch: number) => [0, Math.cos(pitch * DEG), Math.sin(pitch * DEG)] as const;

/** Absolute M/L/A endpoints of a path (the drawing emits nothing else, plus Z). */
function endpoints(d: string): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  const re = /([MLAZ])([^MLAZ]*)/g;
  for (const [, cmd, args] of d.matchAll(re)) {
    const n = (args.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    if (cmd === "M" || cmd === "L") for (let i = 0; i + 1 < n.length; i += 2) out.push({ x: n[i], y: n[i + 1] });
    if (cmd === "A") for (let i = 0; i + 6 < n.length; i += 7) out.push({ x: n[i + 5], y: n[i + 6] });
  }
  return out;
}

function commands(d: string): string {
  return d.replace(/[^MLAZ]/g, "");
}

function inside(drawing: Drawing, p: { x: number; y: number }) {
  const [x, y, w, h] = drawing.viewBox;
  return p.x >= x - 0.1 && p.x <= x + w + 0.1 && p.y >= y - 0.1 && p.y <= y + h + 0.1;
}

const tower: DrawView = { axis: upright(22), explode: 1 };
const exploded = drawEngine(tower);
const assembled = drawEngine({ ...tower, explode: 0 });

describe("drawEngine", () => {
  it("draws all five modules, the shaft in the open gaps and a centreline", () => {
    const modules = new Set(exploded.paths.filter((p) => p.module >= 0).map((p) => p.module));
    expect([...modules].sort()).toEqual([0, 1, 2, 3, 4]);
    expect(exploded.paths.filter((p) => p.kind === "centre")).toHaveLength(1);
    expect(exploded.paths.filter((p) => p.kind === "shaft")).toHaveLength(1);
    expect(assembled.paths.filter((p) => p.kind === "shaft")).toHaveLength(0);
  });

  it("keeps every coordinate finite and inside its viewBox, from any direction", () => {
    const views: DrawView[] = [
      tower,
      { axis: upright(2), explode: 0.6, ports: true, dims: true },
      { axis: [0.35, 0.5, 0.79], explode: 0.12, arcs: true },
      { axis: [-0.6, 0.4, -0.69], explode: 1 },
      { axis: [0, 0, 1], explode: 0 },
    ];
    for (const view of views) {
      const drawing = drawEngine(view);
      expect(drawing.viewBox.every(Number.isFinite)).toBe(true);
      for (const p of drawing.paths) {
        for (const pt of endpoints(p.d)) {
          expect(Number.isFinite(pt.x) && Number.isFinite(pt.y)).toBe(true);
          expect(inside(drawing, pt), `${p.kind} ${p.d.slice(0, 40)}`).toBe(true);
        }
      }
    }
  });

  it("frames the drawing at `fill` of its viewBox", () => {
    const fill = 0.8;
    const d = drawEngine({ ...tower, fill });
    const pts = d.paths.filter((p) => p.kind === "outline").flatMap((p) => endpoints(p.d));
    const w = Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x));
    // Walls and rim ends span the drawing's full width.
    expect(w / d.viewBox[2]).toBeGreaterThan(fill - 0.08);
    expect(w / d.viewBox[2]).toBeLessThanOrEqual(fill + 0.01);
  });

  const hidden = (d: Drawing) => [0, 1, 2, 3, 4].map((m) => d.paths.filter((p) => p.module === m && p.kind === "hidden").length);

  it("dashes the far half of every back rim, and the rear hub's rim under its flange", () => {
    expect(hidden(exploded)).toEqual([1, 1, 1, 1, 3]);
  });

  it("hides the rims that a seated, wider neighbour covers — and only those", () => {
    // Seated: the interface's top sits under the bezel, the models' under the
    // interface; the gear (r 1.9, under the r 1.7 housing) and the flange
    // (r 2.34) still show.
    expect(hidden(assembled)).toEqual([1, 2, 2, 1, 3]);
  });

  it("flattens rims to lines in a level elevation", () => {
    const level = drawEngine({ axis: upright(0), explode: 0.6 });
    const arcs = level.paths.filter((p) => p.kind === "outline" && commands(p.d).includes("A"));
    expect(arcs).toHaveLength(0);
  });

  it("draws rims as circles when the axis points at the viewer", () => {
    const face = drawEngine({ axis: [0, 0, 1], explode: 0 });
    const radii = face.paths
      .filter((p) => p.kind === "outline" && p.d.includes("A"))
      .map((p) => (p.d.match(/A(-?[\d.]+) (-?[\d.]+)/) ?? []).slice(1).map(Number));
    expect(radii.length).toBeGreaterThan(0);
    for (const [rx, ry] of radii) expect(rx).toBeCloseTo(ry, 0);
  });

  it("turns with the axis: a sideways engine is wide, an upright one tall", () => {
    const up = drawEngine({ axis: upright(10), explode: 1 });
    const side = drawEngine({ axis: [Math.cos(10 * DEG), 0, Math.sin(10 * DEG)], explode: 1 });
    expect(up.viewBox[3]).toBeGreaterThan(up.viewBox[2]);
    expect(side.viewBox[2]).toBeGreaterThan(side.viewBox[3]);
    expect(side.viewBox[2]).toBeCloseTo(up.viewBox[3], 0);
  });

  it("anchors a label at each module's right-hand silhouette", () => {
    expect(exploded.anchors.map((a) => a.module)).toEqual([0, 1, 2, 3, 4]);
    for (const a of exploded.anchors) {
      const xs = exploded.paths.filter((p) => p.module === a.module && p.kind === "outline").flatMap((p) => endpoints(p.d).map((q) => q.x));
      expect(a.x).toBeCloseTo(Math.max(...xs), 0);
    }
    // Top to bottom, face first.
    const ys = exploded.anchors.map((a) => a.y);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
  });

  it("puts the tools' ports on the left-hand profile: models, compute, data, then the shaft's end", () => {
    const elev = drawEngine({ axis: upright(2), explode: 0.6, ports: true });
    expect(elev.ports.map((p) => p.module)).toEqual([2, 3, 4, -1]);
    const axisX = elev.viewBox[0] + elev.viewBox[2] / 2;
    for (const p of elev.ports.slice(0, 3)) expect(p.x).toBeLessThan(axisX);
    expect(elev.paths.filter((p) => p.kind === "port")).toHaveLength(4);
    expect(drawEngine(tower).ports).toEqual([]);
  });

  it("draws compute as a heat sink: five fins, the hub showing between them", () => {
    const bodies = (d: Drawing) => d.paths.filter((p) => p.module === 3 && p.kind === "body");
    expect(bodies(exploded)).toHaveLength(9);
    expect(bodies(assembled)).toHaveLength(9);
    // The fins run out to r 1.9, the hub between them only to r 1.3: its walls sit inside the fins'.
    const xs = (p: { d: string }) => endpoints(p.d).map((q) => q.x);
    const span = (p: { d: string }) => Math.max(...xs(p)) - Math.min(...xs(p));
    const widths = bodies(exploded).map(span);
    expect(Math.min(...widths) / Math.max(...widths)).toBeCloseTo(1.3 / 1.9, 1);
  });

  it("draws the face's five arcs on request", () => {
    const d = drawEngine({ ...tower, arcs: true });
    expect(d.paths.filter((p) => p.kind === "arc").map((p) => p.hue)).toEqual([0, 1, 2, 3, 4]);
    // Seen from behind, the face (and its arcs) is out of sight.
    const behind = drawEngine({ axis: [0, 0.5, -0.87], explode: 1, arcs: true });
    expect(behind.paths.filter((p) => p.kind === "arc")).toHaveLength(0);
  });

  it("shifts, gaps and rolls modules for the studio's agency state", () => {
    const agency = drawEngine({ ...tower, explode: 0.22, shift: [0, 0.25, -0.2, 0.3, -0.15], gap: [0, 0.1, 0.3, 0.15, 0.4], roll: [0, 5, -4, 3, -5] });
    const aligned = drawEngine({ ...tower, explode: 0.22 });
    expect(agency.anchors[1].x).not.toBeCloseTo(aligned.anchors[1].x, 0);
    expect(agency.anchors[4].y).toBeGreaterThan(aligned.anchors[4].y);
  });

  it("is deterministic", () => {
    expect(drawEngine(tower)).toEqual(exploded);
  });
});
