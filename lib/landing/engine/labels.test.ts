import { describe, expect, it } from "vitest";

import { mulberry32 } from "@/lib/motion/field";

import { countCrossings, routeLeaders, type Point } from "./labels";

describe("routeLeaders", () => {
  it("runs horizontally from each label, then 45° into its anchor", () => {
    const [leader] = routeLeaders([{ x: 600, y: 300 }], [{ x: 900, y: 360 }], "right");
    expect(leader.from).toEqual({ x: 600, y: 300 });
    expect(leader.knee).toEqual({ x: 840, y: 300 });
    expect(leader.to).toEqual({ x: 900, y: 360 });
  });

  it("points left for labels on the right of the engine", () => {
    const [leader] = routeLeaders([{ x: 1300, y: 500 }], [{ x: 1000, y: 460 }], "left");
    expect(leader.knee).toEqual({ x: 1040, y: 500 });
  });

  it("steepens rather than doubling back when there isn't room for 45°", () => {
    const [leader] = routeLeaders([{ x: 600, y: 100 }], [{ x: 650, y: 400 }], "right");
    expect(leader.knee.x).toBe(600);
    expect(leader.knee.x).toBeLessThanOrEqual(leader.to.x);
  });

  it("pairs labels and anchors in vertical order whatever order they arrive in", () => {
    const leaders = routeLeaders(
      [
        { x: 600, y: 500 },
        { x: 600, y: 100 },
      ],
      [
        { x: 900, y: 120 },
        { x: 900, y: 480 },
      ],
      "right",
    );
    expect(leaders[0].from.y).toBe(100);
    expect(leaders[0].to.y).toBe(120);
    expect(leaders[1].from.y).toBe(500);
    expect(leaders[1].to.y).toBe(480);
  });

  it("never crosses itself across seeded layouts (the tools rack and stack legend shapes)", () => {
    // Real anchors (ports, module rims) sit ≥ 30px apart vertically and within
    // a few px of one column — the documented precondition of routeLeaders.
    const rand = mulberry32(21);
    for (let trial = 0; trial < 500; trial++) {
      const n = 2 + Math.floor(rand() * 4);
      const starts: Point[] = [];
      const anchors: Point[] = [];
      const top = 120 + rand() * 200;
      let anchorY = top - 120 + rand() * 160;
      for (let i = 0; i < n; i++) {
        starts.push({ x: 560 + rand() * 40, y: top + i * (70 + rand() * 60) });
        anchors.push({ x: 820 + rand() * 12, y: anchorY });
        anchorY += 30 + rand() * 120;
      }
      expect(countCrossings(routeLeaders(starts, anchors, "right"))).toBe(0);
    }
  });

  it("moves smoothly with its anchors (1px of jitter never jumps a leader)", () => {
    const starts = [
      { x: 600, y: 200 },
      { x: 600, y: 320 },
    ];
    const anchors = [
      { x: 880, y: 260 },
      { x: 880, y: 300 },
    ];
    const a = routeLeaders(starts, anchors, "right");
    const b = routeLeaders(starts, anchors.map((p) => ({ x: p.x + 1, y: p.y - 1 })), "right");
    for (let i = 0; i < a.length; i++) {
      expect(Math.abs(a[i].knee.x - b[i].knee.x)).toBeLessThanOrEqual(2);
    }
  });

  it("rejects mismatched inputs rather than guessing", () => {
    expect(() => routeLeaders([{ x: 0, y: 0 }], [], "right")).toThrow();
  });
});

describe("countCrossings", () => {
  it("counts a real crossing", () => {
    const x = routeLeaders([{ x: 0, y: 0 }], [{ x: 100, y: 100 }], "right")[0];
    const crossing = { from: { x: 0, y: 100 }, knee: { x: 0, y: 100 }, to: { x: 100, y: 0 } };
    expect(countCrossings([x, crossing])).toBe(1);
  });
});
