import { describe, expect, it } from "vitest";

import { activeIndex, chapterProgress, quantize, segment } from "@/lib/motion/progress";

describe("chapterProgress — pinned", () => {
  // A 3000px section starting at 1000px, in a 1000px viewport: the pin runs
  // for height − viewport = 2000px of scroll.
  const geom = { top: 1000, height: 3000, vh: 1000 };

  it("is 0 before the pin starts and 1 after it ends", () => {
    expect(chapterProgress(0, geom, "pinned")).toBe(0);
    expect(chapterProgress(1000, geom, "pinned")).toBe(0);
    expect(chapterProgress(3000, geom, "pinned")).toBe(1);
    expect(chapterProgress(9000, geom, "pinned")).toBe(1);
  });

  it("is linear through the pin", () => {
    expect(chapterProgress(2000, geom, "pinned")).toBeCloseTo(0.5);
  });

  it("never divides by zero when the section is no taller than the viewport", () => {
    const short = { top: 500, height: 800, vh: 1000 };
    expect(chapterProgress(400, short, "pinned")).toBe(0);
    expect(chapterProgress(600, short, "pinned")).toBe(1);
  });
});

describe("chapterProgress — pass", () => {
  // Progress over the whole trip through the viewport: from the section's top
  // touching the bottom edge to its bottom leaving the top edge.
  const geom = { top: 2000, height: 1000, vh: 1000 };

  it("starts when the top enters and ends when the bottom leaves", () => {
    expect(chapterProgress(1000, geom, "pass")).toBe(0);
    expect(chapterProgress(3000, geom, "pass")).toBe(1);
    expect(chapterProgress(2000, geom, "pass")).toBeCloseTo(0.5);
  });
});

describe("segment", () => {
  it("maps a sub-window of progress to 0..1 and clamps outside it", () => {
    expect(segment(0.1, 0.2, 0.6)).toBe(0);
    expect(segment(0.4, 0.2, 0.6)).toBeCloseTo(0.5);
    expect(segment(0.9, 0.2, 0.6)).toBe(1);
  });

  it("treats an empty window as a step", () => {
    expect(segment(0.49, 0.5, 0.5)).toBe(0);
    expect(segment(0.5, 0.5, 0.5)).toBe(1);
  });
});

describe("activeIndex", () => {
  const stops = [0, 0.25, 0.5, 0.75];

  it("returns the last stop reached", () => {
    expect(activeIndex(0, stops)).toBe(0);
    expect(activeIndex(0.3, stops)).toBe(1);
    expect(activeIndex(0.75, stops)).toBe(3);
    expect(activeIndex(1, stops)).toBe(3);
  });
});

describe("quantize", () => {
  it("snaps to a fixed grid so sub-pixel noise doesn't re-seek", () => {
    expect(quantize(0.50001, 1 / 1000)).toBe(quantize(0.5, 1 / 1000));
    expect(quantize(1, 1 / 1000)).toBe(1);
    expect(quantize(0, 1 / 1000)).toBe(0);
  });
});
