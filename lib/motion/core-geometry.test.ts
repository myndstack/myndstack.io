import { describe, expect, it } from "vitest";

import { arcLayout, arcPath, CORE, polar, ringTicks } from "@/lib/motion/core-geometry";

const subpaths = (d: string) => (d.match(/M/g) ?? []).length;

describe("polar", () => {
  it("measures degrees clockwise from 12 o'clock", () => {
    const top = polar(500, 500, 100, 0);
    expect(top.x).toBeCloseTo(500, 6);
    expect(top.y).toBeCloseTo(400, 6);
    const right = polar(500, 500, 100, 90);
    expect(right.x).toBeCloseTo(600, 6);
    expect(right.y).toBeCloseTo(500, 6);
  });
});

describe("ringTicks", () => {
  it("draws one subpath per tick, split into minor and major paths", () => {
    const { minor, major } = ringTicks({ count: 180, rIn: 400, rOut: 420, rMajorIn: 388, majorEvery: 15 });
    expect(subpaths(major)).toBe(12);
    expect(subpaths(minor)).toBe(168);
  });

  it("rounds coordinates so the SSR markup stays small and stable", () => {
    const { minor } = ringTicks({ count: 12, rIn: 400, rOut: 420, rMajorIn: 388, majorEvery: 99 });
    expect(minor).not.toMatch(/\d\.\d{3,}/);
  });
});

describe("arcLayout", () => {
  it("fills the circle exactly: arcs plus gaps = 360°", () => {
    const arcs = arcLayout(5, 8, -32);
    expect(arcs).toHaveLength(5);
    const covered = arcs.reduce((sum, a) => sum + (a.a1 - a.a0), 0);
    expect(covered + 5 * 8).toBeCloseTo(360, 9);
  });

  it("centres the first arc on 12 o'clock", () => {
    const [first] = arcLayout(5, 8, -32);
    expect(first.mid).toBeCloseTo(0, 9);
  });
});

describe("arcPath", () => {
  it("is a single contour", () => {
    expect(subpaths(arcPath(500, 500, 400, 10, 70))).toBe(1);
  });

  it("sets the large-arc flag past 180°", () => {
    expect(arcPath(500, 500, 400, 0, 90)).toContain(" 0 0 1 ");
    expect(arcPath(500, 500, 400, 0, 270)).toContain(" 0 1 1 ");
  });

  it("exposes the canonical ring constants", () => {
    expect(CORE.size).toBe(1000);
    expect(CORE.arcs).toHaveLength(5);
  });
});
