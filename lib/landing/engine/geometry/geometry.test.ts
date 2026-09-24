import { describe, expect, it } from "vitest";

import { CORE } from "@/lib/motion/core-geometry";

import {
  GLYPH,
  MODULE_Z,
  S,
  buildEngine,
  drawCalls,
  engineBounds,
  moduleBounds,
  moduleExplode,
  moduleZ,
  pack,
  totalTriangles,
  type Mesh,
} from "./index";

const engines = [buildEngine(0), buildEngine(1), buildEngine(2)] as const;
const hi = engines[0];

const kinds = (m: Mesh) => {
  const out: number[] = [];
  for (let i = 0; i < m.extras.length; i += 4) out.push(m.extras[i]);
  return out;
};

describe("the face is the Core", () => {
  it("has 180 ticks, 12 of them major", () => {
    const k = kinds(hi.glyphs.dial);
    expect(k.filter((x) => x === GLYPH.tickMajor).length / 4).toBe(12);
    expect(k.filter((x) => x === GLYPH.tickMinor).length / 4).toBe(168);
  });

  it("puts every tick between the CORE tick radii", () => {
    const p = hi.glyphs.dial.positions;
    const k = kinds(hi.glyphs.dial);
    for (let v = 0; v < k.length; v++) {
      if (k[v] !== GLYPH.tickMinor && k[v] !== GLYPH.tickMajor) continue;
      const r = Math.hypot(p[v * 3], p[v * 3 + 1]) / S;
      expect(r).toBeGreaterThanOrEqual(CORE.rTickMajorIn - 0.5);
      expect(r).toBeLessThanOrEqual(CORE.rTickOut + 0.5);
    }
  });

  it("draws the five arcs at the CORE radius over their CORE spans, each drawing on 0 → 1", () => {
    const m = hi.glyphs.dial;
    for (let hue = 0; hue < 5; hue++) {
      let minAngle = Infinity;
      let maxAngle = -Infinity;
      let minDraw = Infinity;
      let maxDraw = -Infinity;
      for (let v = 0; v < m.extras.length / 4; v++) {
        if (m.extras[v * 4] !== GLYPH.arc || m.extras[v * 4 + 1] !== hue) continue;
        const x = m.positions[v * 3];
        const y = m.positions[v * 3 + 1];
        const r = Math.hypot(x, y) / S;
        expect(Math.abs(r - CORE.rArc)).toBeLessThanOrEqual(3.6);
        let deg = (Math.atan2(x, y) * 180) / Math.PI;
        if (hue === 0 && deg > 180) deg -= 360;
        minAngle = Math.min(minAngle, deg);
        maxAngle = Math.max(maxAngle, deg);
        minDraw = Math.min(minDraw, m.extras[v * 4 + 2]);
        maxDraw = Math.max(maxDraw, m.extras[v * 4 + 2]);
      }
      const arc = CORE.arcs[hue];
      const norm = (d: number) => (d > 180 ? d - 360 : d);
      expect(minAngle).toBeCloseTo(hue === 0 ? arc.a0 : norm(arc.a0), 3);
      expect(maxAngle).toBeCloseTo(hue === 0 ? arc.a1 : norm(arc.a1), 3);
      expect(minDraw).toBe(0);
      expect(maxDraw).toBe(1);
    }
  });
});

describe("surfaces", () => {
  it("wind counter-clockwise seen from the side their normals face (front faces are the outside)", () => {
    for (const engine of engines) {
      for (const m of [...engine.modules.map((x) => x.surface), engine.glyphs.dial, engine.shaft]) {
        const p = m.positions;
        const n = m.normals;
        let bad = 0;
        let total = 0;
        for (let i = 0; i < m.indices.length; i += 3) {
          const [a, b, c] = [m.indices[i], m.indices[i + 1], m.indices[i + 2]];
          const ux = p[b * 3] - p[a * 3];
          const uy = p[b * 3 + 1] - p[a * 3 + 1];
          const uz = p[b * 3 + 2] - p[a * 3 + 2];
          const vx = p[c * 3] - p[a * 3];
          const vy = p[c * 3 + 1] - p[a * 3 + 1];
          const vz = p[c * 3 + 2] - p[a * 3 + 2];
          const gx = uy * vz - uz * vy;
          const gy = uz * vx - ux * vz;
          const gz = ux * vy - uy * vx;
          const area = Math.hypot(gx, gy, gz);
          if (area < 1e-9) continue; // degenerate fan tip at the axis
          total += 1;
          if (gx * n[a * 3] + gy * n[a * 3 + 1] + gz * n[a * 3 + 2] < 0) bad += 1;
        }
        expect(total).toBeGreaterThan(0);
        expect(bad).toBe(0);
      }
    }
  });

  it("have unit normals and four extras per vertex", () => {
    for (const m of hi.modules.map((x) => x.surface)) {
      expect(m.extras.length).toBe((m.positions.length / 3) * 4);
      for (let i = 0; i < m.normals.length; i += 3) {
        expect(Math.hypot(m.normals[i], m.normals[i + 1], m.normals[i + 2])).toBeCloseTo(1, 4);
      }
    }
  });

  it("pack into typed arrays deterministically", () => {
    const a = pack(buildEngine(1).modules[3].surface);
    const b = pack(buildEngine(1).modules[3].surface);
    expect(a.position).toEqual(b.position);
    expect(a.index).toEqual(b.index);
    expect(a.triangles).toBe(a.index.length / 3);
  });
});

describe("budgets", () => {
  it("stays inside the triangle and draw-call budgets at every level of detail", () => {
    expect(totalTriangles(engines[0])).toBeLessThanOrEqual(120_000);
    expect(totalTriangles(engines[1])).toBeLessThanOrEqual(80_000);
    expect(totalTriangles(engines[2])).toBeLessThanOrEqual(40_000);
    for (const e of engines) expect(drawCalls(e)).toBeLessThanOrEqual(20);
  });

  it("gets cheaper with every level", () => {
    expect(totalTriangles(engines[1])).toBeLessThan(totalTriangles(engines[0]));
    expect(totalTriangles(engines[2])).toBeLessThan(totalTriangles(engines[1]));
  });
});

describe("assembly and explode", () => {
  it("seats modules face to data without overlapping", () => {
    for (let k = 0; k < 4; k++) {
      const front = moduleZ(k, 0) + hi.modules[k].seatBack;
      const behind = moduleZ(k + 1, 0) + hi.modules[k + 1].seatFront;
      expect(front - behind).toBeGreaterThan(0.005);
      expect(front - behind).toBeLessThan(0.08);
    }
    expect(MODULE_Z[0]).toBeGreaterThan(MODULE_Z[4]);
  });

  it("explodes top-down and seats bottom-up", () => {
    expect([0, 1, 2, 3, 4].map((k) => moduleExplode(0, k))).toEqual([0, 0, 0, 0, 0]);
    expect([0, 1, 2, 3, 4].map((k) => moduleExplode(1, k))).toEqual([1, 1, 1, 1, 1]);
    // Assembling (e falling): the data flange is seated long before the face.
    expect(moduleExplode(0.35, 4)).toBe(0);
    expect(moduleExplode(0.35, 0)).toBeGreaterThan(0.5);
    // Exploding (e rising): the face lifts off first.
    expect(moduleExplode(0.1, 0)).toBeGreaterThan(0);
    expect(moduleExplode(0.1, 4)).toBe(0);
  });

  it("keeps the whole engine inside its bounding sphere, assembled and exploded", () => {
    for (const e of [0, 0.5, 1]) {
      const b = engineBounds(hi, e);
      hi.modules.forEach((m, k) => {
        const z = moduleZ(k, e);
        for (let i = 0; i < m.surface.positions.length; i += 3) {
          const d = Math.hypot(m.surface.positions[i], m.surface.positions[i + 1], m.surface.positions[i + 2] + z - b.z);
          expect(d).toBeLessThanOrEqual(b.radius + 1e-6);
        }
      });
    }
    expect(engineBounds(hi, 1).radius).toBeGreaterThan(engineBounds(hi, 0).radius);
  });

  it("frames a single module tighter than the whole engine", () => {
    for (let k = 0; k < 5; k++) expect(moduleBounds(hi, k, 1).radius).toBeLessThan(engineBounds(hi, 1).radius);
  });
});
