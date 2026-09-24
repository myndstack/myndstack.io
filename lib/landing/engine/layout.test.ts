import { describe, expect, it } from "vitest";

import { boxOf, colLeft, colRight, grid, SAFE_BOTTOM, SAFE_TOP } from "./layout";

describe("grid", () => {
  it("lays the design frame out at 1440×900: rails at 48, content 72–1368, 86px columns on a 110px pitch", () => {
    const g = grid(1440, 900);
    expect(g.columns).toBe(12);
    expect(g.rails).toEqual([48, 1392]);
    expect(g.x0).toBeCloseTo(72, 6);
    expect(g.x1).toBeCloseTo(1368, 6);
    expect(g.col).toBeCloseTo(86, 6);
    expect(g.gap).toBe(24);
    expect(colLeft(g, 2) - colLeft(g, 1)).toBeCloseTo(110, 6);
    expect(colLeft(g, 6)).toBeCloseTo(622, 6);
    expect(colRight(g, 5)).toBeCloseTo(598, 6);
    expect(colRight(g, 12)).toBeCloseTo(1368, 6);
    expect([g.y0, g.y1]).toEqual([SAFE_TOP, 900 - SAFE_BOTTOM]);
  });

  it("caps the frame at 1600px and centres it on wide screens", () => {
    const g = grid(1920, 1080);
    expect(g.rails).toEqual([208, 1712]);
    expect(g.x0).toBeCloseTo(232, 6);
    expect(g.x1).toBeCloseTo(1688, 6);
  });

  it("scales the rail inset with the viewport between 24 and 48px", () => {
    const g = grid(1024, 768);
    expect(g.rails?.[0]).toBeCloseTo(1024 / 30, 6);
    expect(g.x0).toBeCloseTo(1024 / 30 + 24, 6);
  });

  it("drops to 8 columns (24px margins, 20px gutters) on tablets, with no rails", () => {
    const g = grid(768, 1024);
    expect(g.columns).toBe(8);
    expect(g.rails).toBeNull();
    expect([g.x0, g.x1]).toEqual([24, 744]);
    expect(g.gap).toBe(20);
    expect(g.col).toBeCloseTo(72.5, 6);
  });

  it("drops to 4 columns (20px sides) on phones", () => {
    const g = grid(390, 844);
    expect(g.columns).toBe(4);
    expect([g.x0, g.x1]).toEqual([20, 370]);
    expect(colRight(g, 4)).toBeCloseTo(370, 6);
  });
});

describe("boxOf", () => {
  const g = grid(1440, 900);

  it("spans whole columns across the safe area by default", () => {
    expect(boxOf(g, { cols: [6, 12] })).toEqual({ x: 622, y: 96, w: 746, h: 732 });
  });

  it("takes rows as fractions of the viewport height", () => {
    const b = boxOf(g, { cols: [1, 12], rows: [0, 1] });
    expect(b.y).toBe(0);
    expect(b.h).toBe(900);
    expect(b.w).toBeCloseTo(1296, 6);
  });

  it("clamps columns to the grid (a 12-column box on a 4-column phone is the whole column)", () => {
    const phone = grid(390, 844);
    const b = boxOf(phone, { cols: [7, 12] });
    expect(b.x).toBeCloseTo(20, 6);
    expect(b.w).toBeCloseTo(350, 6);
  });
});
