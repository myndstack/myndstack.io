import { describe, expect, it } from "vitest";

import { POSTER_VIEW, towerPoster } from "./drawing";

const numbers = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe("towerPoster", () => {
  const assembled = towerPoster({ explode: 0, pitch: 22 });
  const exploded = towerPoster({ explode: 1, pitch: 22 });

  it("draws all five modules and the centreline", () => {
    const modules = new Set(assembled.paths.filter((p) => p.kind !== "centre").map((p) => p.module));
    expect([...modules].sort()).toEqual([0, 1, 2, 3, 4]);
    expect(assembled.paths.filter((p) => p.kind === "centre")).toHaveLength(1);
  });

  it("keeps every coordinate finite and inside the view", () => {
    for (const poster of [assembled, exploded, towerPoster({ explode: 0.6, pitch: 2 })]) {
      for (const p of poster.paths) {
        for (const n of numbers(p.d)) {
          expect(Number.isFinite(n)).toBe(true);
          expect(n).toBeGreaterThanOrEqual(-1);
          expect(n).toBeLessThanOrEqual(POSTER_VIEW + 1);
        }
      }
    }
  });

  it("gives every module its hue inlay except the face (whose arcs are its colour)", () => {
    const inlays = assembled.paths.filter((p) => p.kind === "inlay");
    expect(inlays.map((p) => p.module).sort()).toEqual([1, 2, 3, 4]);
    expect(inlays.every((p) => p.hue !== undefined)).toBe(true);
  });

  it("marks the hidden back rims as hidden", () => {
    expect(assembled.paths.filter((p) => p.kind === "hidden")).toHaveLength(5);
  });

  it("flattens rims to lines in a level elevation", () => {
    const elev = towerPoster({ explode: 0.6, pitch: 0 });
    const rims = elev.paths.filter((p) => p.kind === "outline" && p.d.includes("H") && !p.d.includes("V"));
    expect(rims.length).toBeGreaterThan(0);
  });

  it("is deterministic", () => {
    expect(towerPoster({ explode: 1, pitch: 22 })).toEqual(exploded);
  });
});
