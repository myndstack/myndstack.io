import { describe, expect, it } from "vitest";

import { clampDt, clampLag, glideStep, isJump, smoothToward } from "@/lib/motion/smooth";

describe("smoothToward", () => {
  it("moves toward the target and never overshoots", () => {
    const v = smoothToward(0, 100, 16, 140);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(100);
    expect(smoothToward(100, 0, 16, 140)).toBeLessThan(100);
  });

  it("is frame-rate independent (two 8ms steps ≈ one 16ms step)", () => {
    const once = smoothToward(0, 1000, 16, 140);
    const twice = smoothToward(smoothToward(0, 1000, 8, 140), 1000, 8, 140);
    expect(twice).toBeCloseTo(once, 9);
  });

  it("returns the target when tau is 0", () => {
    expect(smoothToward(3, 42, 16, 0)).toBe(42);
  });
});

describe("clampLag", () => {
  it("keeps the displayed value within maxLag of the target", () => {
    expect(clampLag(0, 1000, 300)).toBe(700);
    expect(clampLag(2000, 1000, 300)).toBe(1300);
    expect(clampLag(900, 1000, 300)).toBe(900);
  });
});

describe("clampDt", () => {
  it("clamps to [0, max] and treats junk as 0", () => {
    expect(clampDt(16)).toBe(16);
    expect(clampDt(5000)).toBe(50);
    expect(clampDt(-3)).toBe(0);
    expect(clampDt(Number.NaN)).toBe(0);
  });
});

describe("glideStep", () => {
  const opts = { tauMs: 140, eps: 0.5, maxLag: 300 };

  it("settles exactly on the target within eps", () => {
    expect(glideStep(999.8, 1000, 16, opts)).toEqual({ value: 1000, settled: true });
  });

  it("converges and settles in a bounded number of frames", () => {
    let value = 700;
    let frames = 0;
    let settled = false;
    while (!settled && frames < 200) {
      ({ value, settled } = glideStep(value, 1000, 16, opts));
      frames++;
    }
    expect(settled).toBe(true);
    expect(value).toBe(1000);
    expect(frames).toBeLessThan(80);
  });

  it("applies the lag clamp before smoothing", () => {
    const { value } = glideStep(0, 5000, 0, opts);
    expect(value).toBe(4700);
  });
});

describe("isJump", () => {
  it("flags scroll moves larger than a viewport in one frame", () => {
    expect(isJump(0, 2000, 900)).toBe(true);
    expect(isJump(0, 200, 900)).toBe(false);
    expect(isJump(5000, 3000, 900)).toBe(true);
  });
});
