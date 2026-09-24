import { describe, expect, it } from "vitest";

import { SPRING_OMEGA, isSettled, springStep, type SpringState } from "./spring";

const REST: SpringState = { x: 0, v: 0 };

/** Step `n` frames of `dt` seconds toward `target`. */
function run(s: SpringState, target: number, omega: number, dt: number, n: number, maxLag?: number): SpringState {
  let out = s;
  for (let i = 0; i < n; i++) out = springStep(out, target, omega, dt, maxLag);
  return out;
}

describe("springStep (critically damped, exact)", () => {
  it("does nothing in zero time", () => {
    const s = { x: 12, v: -40 };
    expect(springStep(s, 500, 16, 0)).toEqual(s);
  });

  it("ignores a negative or non-finite frame time instead of exploding", () => {
    const s = { x: 12, v: 3 };
    expect(springStep(s, 500, 16, -0.016)).toEqual(s);
    expect(springStep(s, 500, 16, Number.NaN)).toEqual(s);
  });

  it("is the same at 30, 60, 120 and 144 Hz (exact composition)", () => {
    // 1/3 s is a whole number of frames at every rate (10, 20, 40, 48).
    const one = run(REST, 1000, 16, 1 / 30, 10);
    for (const hz of [60, 120, 144]) {
      const s = run(REST, 1000, 16, 1 / hz, hz / 3);
      expect(s.x, `${hz} Hz`).toBeCloseTo(one.x, 6);
      expect(s.v, `${hz} Hz`).toBeCloseTo(one.v, 6);
    }
  });

  it("approaches the target from rest without overshooting", () => {
    let s = REST;
    let prev = 0;
    for (let i = 0; i < 240; i++) {
      s = springStep(s, 1000, 16, 1 / 120);
      expect(s.x).toBeGreaterThanOrEqual(prev - 1e-9);
      expect(s.x).toBeLessThanOrEqual(1000 + 1e-9);
      prev = s.x;
    }
  });

  it("settles a 1000px jump to under half a pixel in about 0.65 s at ω = 16", () => {
    expect(Math.abs(1000 - run(REST, 1000, 16, 1 / 60, 36).x)).toBeGreaterThan(0.5);
    expect(Math.abs(1000 - run(REST, 1000, 16, 1 / 60, 40).x)).toBeLessThan(0.5);
  });

  it("settles faster on coarse pointers (ω = 22)", () => {
    const fine = run(REST, 1000, SPRING_OMEGA.fine, 1 / 60, 20).x;
    const coarse = run(REST, 1000, SPRING_OMEGA.coarse, 1 / 60, 20).x;
    expect(1000 - coarse).toBeLessThan(1000 - fine);
  });

  it("never lags further than the cap behind a moving target", () => {
    let s = REST;
    let target = 0;
    for (let i = 0; i < 60; i++) {
      target += 400;
      s = springStep(s, target, 16, 1 / 60, 540);
      expect(target - s.x).toBeLessThanOrEqual(540 + 1e-9);
    }
  });

  it("lands on the target after a long pause (a background tab)", () => {
    const s = springStep({ x: 0, v: 900 }, 4000, 16, 5);
    expect(s.x).toBeCloseTo(4000, 6);
    expect(s.v).toBeCloseTo(0, 6);
  });
});

describe("isSettled", () => {
  it("is true within the tolerance in both position and speed", () => {
    expect(isSettled({ x: 999.8, v: 0.1 }, 1000)).toBe(true);
    expect(isSettled({ x: 999, v: 0 }, 1000)).toBe(false);
    expect(isSettled({ x: 1000, v: 5 }, 1000)).toBe(false);
  });
});
