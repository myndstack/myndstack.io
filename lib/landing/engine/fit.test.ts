import { describe, expect, it } from "vitest";

import { mulberry32 } from "@/lib/motion/field";

import { circleDistance, fitCamera, focalPx, sphereDistance, targetCircle } from "./fit";

const projectedCircle = (radius: number, distance: number, fov: number, h: number) => (focalPx(fov, h) * radius) / distance;
const projectedSphere = (radius: number, distance: number, fov: number, h: number) =>
  (focalPx(fov, h) * radius) / Math.sqrt(distance * distance - radius * radius);

describe("distances", () => {
  it("puts a face-on circle at exactly the requested pixel radius", () => {
    for (const [r, px, fov, h] of [
      [2.1, 267, 24, 900],
      [2.1, 130, 24, 844],
      [1, 10, 14, 600],
    ]) {
      const d = circleDistance(r, px, fov, h);
      expect(projectedCircle(r, d, fov, h)).toBeCloseTo(px, 6);
    }
  });

  it("puts a sphere's silhouette at exactly the requested pixel radius", () => {
    for (const [r, px, fov, h] of [
      [3.4, 290, 24, 900],
      [3.4, 60, 14, 1080],
    ]) {
      const d = sphereDistance(r, px, fov, h);
      expect(projectedSphere(r, d, fov, h)).toBeCloseTo(px, 6);
      expect(d).toBeGreaterThan(r);
    }
  });
});

describe("targetCircle", () => {
  it("centres in the box and uses the limiting side", () => {
    expect(targetCircle({ x: 700, y: 96, w: 600, h: 760 }, 0.9, 0, 0)).toEqual({ cx: 1000, cy: 476, r: 270 });
  });

  it("offsets by fractions of the box", () => {
    const c = targetCircle({ x: 0, y: 0, w: 400, h: 200 }, 1, 0.06, -0.1);
    expect(c.cx).toBeCloseTo(224, 6);
    expect(c.cy).toBeCloseTo(80, 6);
  });
});

describe("fitCamera", () => {
  it("keeps the engine inside its box across seeded sweeps of boxes, aspects, FOVs and fills", () => {
    const rand = mulberry32(7);
    for (let i = 0; i < 500; i++) {
      const canvas = { w: 320 + rand() * 1800, h: 400 + rand() * 900 };
      const w = 40 + rand() * (canvas.w - 40);
      const h = 40 + rand() * (canvas.h - 40);
      const box = { x: rand() * (canvas.w - w), y: rand() * (canvas.h - h), w, h };
      const fov = 12 + rand() * 30;
      const fill = 0.3 + rand() * 0.7;
      const kind = rand() > 0.5 ? ("circle" as const) : ("sphere" as const);
      const fit = fitCamera({ canvas, box, kind, radius: 0.5 + rand() * 4, fovDeg: fov, fill, offX: 0, offY: 0 });
      expect(fit).not.toBeNull();
      if (!fit) continue;
      expect(Number.isFinite(fit.distance)).toBe(true);
      expect(fit.cx - fit.rPx).toBeGreaterThanOrEqual(box.x - 1);
      expect(fit.cx + fit.rPx).toBeLessThanOrEqual(box.x + box.w + 1);
      expect(fit.cy - fit.rPx).toBeGreaterThanOrEqual(box.y - 1);
      expect(fit.cy + fit.rPx).toBeLessThanOrEqual(box.y + box.h + 1);
    }
  });

  it("shifts the lens so the engine centre lands on the target, not the canvas centre", () => {
    const fit = fitCamera({
      canvas: { w: 1440, h: 900 },
      box: { x: 732, y: 96, w: 580, h: 764 },
      kind: "circle",
      radius: 2.1,
      fovDeg: 24,
      fill: 0.92,
      offX: 0,
      offY: 0,
    });
    expect(fit).not.toBeNull();
    expect(fit!.shiftX).toBeCloseTo(1440 / 2 - (732 + 290), 6);
    expect(fit!.shiftY).toBeCloseTo(900 / 2 - (96 + 382), 6);
  });

  it("returns null for an empty box instead of NaN", () => {
    expect(
      fitCamera({ canvas: { w: 1440, h: 900 }, box: { x: 0, y: 0, w: 0, h: 300 }, kind: "sphere", radius: 2, fovDeg: 24, fill: 1, offX: 0, offY: 0 }),
    ).toBeNull();
    expect(
      fitCamera({ canvas: { w: 0, h: 0 }, box: { x: 0, y: 0, w: 10, h: 10 }, kind: "sphere", radius: 2, fovDeg: 24, fill: 1, offX: 0, offY: 0 }),
    ).toBeNull();
  });
});
