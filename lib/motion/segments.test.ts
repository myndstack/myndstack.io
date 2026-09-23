import { describe, expect, it } from "vitest";

import { SEGMENT_UNIT, segmentAt, segmentTime, type RunGeometry } from "@/lib/motion/segments";

// A run starting at y=1000 with three segments: [0,400) [400,1000) [1000,1600]
const run: RunGeometry = { top: 1000, stops: [0, 400, 1000], end: 1600 };

describe("segmentTime", () => {
  it("is 0 before the first stop and N·UNIT after the end", () => {
    expect(segmentTime(0, run)).toBe(0);
    expect(segmentTime(999, run)).toBe(0);
    expect(segmentTime(1000 + 1600, run)).toBe(3 * SEGMENT_UNIT);
    expect(segmentTime(99_999, run)).toBe(3 * SEGMENT_UNIT);
  });

  it("lands exactly on segment boundaries", () => {
    expect(segmentTime(1000, run)).toBe(0);
    expect(segmentTime(1400, run)).toBe(SEGMENT_UNIT);
    expect(segmentTime(2000, run)).toBe(2 * SEGMENT_UNIT);
  });

  it("interpolates linearly inside a segment", () => {
    expect(segmentTime(1200, run)).toBe(0.5 * SEGMENT_UNIT);
    expect(segmentTime(1700, run)).toBe(1.5 * SEGMENT_UNIT);
    expect(segmentTime(2300, run)).toBe(2.5 * SEGMENT_UNIT);
  });

  it("supports a negative first stop (an 'enter' segment before the run top)", () => {
    const entering: RunGeometry = { top: 5000, stops: [-800, 0], end: 1000 };
    expect(segmentTime(4200, entering)).toBe(0);
    expect(segmentTime(4600, entering)).toBe(0.5 * SEGMENT_UNIT);
    expect(segmentTime(5000, entering)).toBe(SEGMENT_UNIT);
    expect(segmentTime(5500, entering)).toBe(1.5 * SEGMENT_UNIT);
  });

  it("skips zero-length segments instead of dividing by zero", () => {
    const squashed: RunGeometry = { top: 0, stops: [0, 500, 500], end: 900 };
    expect(segmentTime(499, squashed)).toBeCloseTo(0.998 * SEGMENT_UNIT, 5);
    expect(segmentTime(500, squashed)).toBe(2 * SEGMENT_UNIT);
    expect(Number.isFinite(segmentTime(500, squashed))).toBe(true);
  });

  it("is monotonic across the whole run", () => {
    let prev = -1;
    for (let y = 0; y < 3000; y += 7) {
      const t = segmentTime(y, run);
      expect(t).toBeGreaterThanOrEqual(prev);
      prev = t;
    }
  });
});

describe("segmentAt", () => {
  it("splits a time into segment index and local progress", () => {
    expect(segmentAt(0, 3)).toEqual({ index: 0, local: 0 });
    expect(segmentAt(1500, 3)).toEqual({ index: 1, local: 0.5 });
    expect(segmentAt(3000, 3)).toEqual({ index: 2, local: 1 });
    expect(segmentAt(-5, 3)).toEqual({ index: 0, local: 0 });
  });
});
