import { describe, expect, it } from "vitest";

import { bezier, monotoneHermite } from "./ease";

describe("bezier", () => {
  it("hits its ends exactly", () => {
    const e = bezier([0.55, 0, 0.25, 1]);
    expect(e(0)).toBe(0);
    expect(e(1)).toBe(1);
  });

  it("is the identity for a linear curve", () => {
    const e = bezier([0, 0, 1, 1]);
    for (const t of [0.1, 0.33, 0.5, 0.9]) expect(e(t)).toBeCloseTo(t, 6);
  });

  it("matches CSS ease-in-out (0.42, 0, 0.58, 1) at known points", () => {
    const e = bezier([0.42, 0, 0.58, 1]);
    expect(e(0.5)).toBeCloseTo(0.5, 5);
    expect(e(0.25)).toBeCloseTo(0.1291, 3);
  });

  it("starts and ends flat for the travel ease (zero velocity at holds)", () => {
    const e = bezier([0.55, 0, 0.25, 1]);
    expect(e(0.001) / 0.001).toBeLessThan(0.02);
    expect((1 - e(0.999)) / 0.001).toBeLessThan(0.05);
  });

  it("overshoots for the lock ease, then settles on 1", () => {
    const e = bezier([0.34, 1.4, 0.64, 1]);
    const peak = Math.max(...Array.from({ length: 101 }, (_, i) => e(i / 100)));
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThan(1.1);
    expect(e(1)).toBe(1);
  });

  it("clamps its input", () => {
    const e = bezier([0.55, 0, 0.25, 1]);
    expect(e(-1)).toBe(0);
    expect(e(2)).toBe(1);
  });
});

describe("monotoneHermite", () => {
  it("passes through every knot", () => {
    const xs = [0, 0.3, 0.7, 1];
    const vs = [0, 10, 40, 50];
    for (let i = 0; i < xs.length; i++) expect(monotoneHermite(xs, vs, xs[i])).toBeCloseTo(vs[i], 9);
  });

  it("is flat at both ends and never overshoots between knots", () => {
    const xs = [0, 0.4, 1];
    const vs = [0, 90, 90];
    expect(monotoneHermite(xs, vs, 0.001)).toBeLessThan(0.1);
    for (let i = 0; i <= 200; i++) {
      const v = monotoneHermite(xs, vs, i / 200);
      expect(v).toBeGreaterThanOrEqual(-1e-9);
      expect(v).toBeLessThanOrEqual(90 + 1e-9);
    }
  });

  it("keeps moving through an interior knot of a monotone run (no stop)", () => {
    const xs = [0, 0.5, 1];
    const vs = [0, 50, 100];
    const slope = (monotoneHermite(xs, vs, 0.501) - monotoneHermite(xs, vs, 0.499)) / 0.002;
    expect(slope).toBeGreaterThan(50);
  });
});
