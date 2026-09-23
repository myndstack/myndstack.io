import { describe, expect, it } from "vitest";

import {
  arcPolyline,
  circuitPolyline,
  linePolyline,
  polylineD,
  resample,
  sameSkeleton,
  tanglePolyline,
} from "@/lib/motion/paths";

describe("resample", () => {
  it("returns exactly n points and keeps both endpoints", () => {
    const pts = resample(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ],
      5,
    );
    expect(pts).toHaveLength(5);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[4]).toEqual({ x: 10, y: 10 });
    // Evenly spaced by arc length: the midpoint is the corner.
    expect(pts[2].x).toBeCloseTo(10, 6);
    expect(pts[2].y).toBeCloseTo(0, 6);
  });
});

describe("polylineD", () => {
  it("writes an M…L path with fixed precision", () => {
    expect(
      polylineD([
        { x: 0, y: 0 },
        { x: 1.23456, y: 2 },
      ]),
    ).toBe("M0 0L1.23 2");
  });
});

describe("morph pairs share a skeleton (anime tweens d number-by-number)", () => {
  it("tangle → circuit", () => {
    expect(sameSkeleton(polylineD(tanglePolyline(7, 48)), polylineD(circuitPolyline(48)))).toBe(true);
  });

  it("ring arc → unrolled line", () => {
    expect(
      sameSkeleton(polylineD(arcPolyline(500, 500, 400, -32, 328, 64)), polylineD(linePolyline(40, 960, 500, 64))),
    ).toBe(true);
  });

  it("detects a mismatch", () => {
    expect(sameSkeleton("M0 0L1 1", "M0 0L1 1L2 2")).toBe(false);
    expect(sameSkeleton("M0 0L1 1", "M0 0C1 1 2 2 3 3")).toBe(false);
  });
});

describe("tanglePolyline", () => {
  it("is deterministic for a seed", () => {
    expect(tanglePolyline(3, 32)).toEqual(tanglePolyline(3, 32));
    expect(tanglePolyline(3, 32)).not.toEqual(tanglePolyline(4, 32));
  });
});
