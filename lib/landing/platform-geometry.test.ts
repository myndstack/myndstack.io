import { describe, expect, it } from "vitest";

import { DISCIPLINES } from "@/lib/landing/chapters";
import {
  LAYERS,
  PLATE,
  PLATFORM_VIEW,
  labelLayout,
  leaderPath,
  plateFaces,
  plateOffset,
  plateY,
} from "@/lib/landing/platform-geometry";

describe("plates", () => {
  it("stack top to bottom, tighter when built than exploded", () => {
    for (let i = 1; i < LAYERS; i++) {
      expect(plateY(i)).toBeGreaterThan(plateY(i - 1));
    }
    const built = plateY(LAYERS - 1) - plateY(0);
    const exploded = built + plateOffset(LAYERS - 1) - plateOffset(0);
    expect(exploded).toBeGreaterThan(built * 2);
  });

  it("fit inside the view when exploded", () => {
    for (let i = 0; i < LAYERS; i++) {
      const top = plateY(i) + plateOffset(i) - PLATE.h;
      const bottom = plateY(i) + plateOffset(i) + PLATE.h + PLATE.t;
      expect(top).toBeGreaterThanOrEqual(0);
      expect(bottom).toBeLessThanOrEqual(PLATFORM_VIEW.h);
    }
  });

  it("draws three closed faces per plate", () => {
    const faces = plateFaces(500, 300);
    for (const d of [faces.top, faces.left, faces.right]) {
      expect(d.startsWith("M")).toBe(true);
      expect(d.endsWith("Z")).toBe(true);
    }
  });
});

describe("leader lines", () => {
  const labels = labelLayout(DISCIPLINES);

  it("gives every discipline a label", () => {
    expect(labels).toHaveLength(DISCIPLINES.length);
  });

  it("keeps labels clear of the stack, on their side", () => {
    for (const l of labels) {
      if (l.side === "left") expect(l.x).toBeLessThan(PLATE.cx - PLATE.w - 40);
      else expect(l.x).toBeGreaterThan(PLATE.cx + PLATE.w + 40);
    }
  });

  it("ends every line on its own plate's top edge (built position)", () => {
    for (const l of labels) {
      const cy = plateY(l.layer);
      // On the front-left or front-right edge of the rhombus: |dx|/w + |dy|/h = 1.
      const dx = Math.abs(l.end.x - PLATE.cx) / PLATE.w;
      const dy = Math.abs(l.end.y - cy) / PLATE.h;
      expect(dx + dy).toBeCloseTo(1, 6);
      expect(l.end.y).toBeGreaterThanOrEqual(cy);
    }
  });

  it("is a single M-H-L contour (so pathLength=1 draws it end to end)", () => {
    for (const l of labels) {
      const d = leaderPath(l);
      expect(d.replace(/[^A-Za-z]/g, "")).toBe("MHL");
    }
  });

  it("doesn't stack two labels on the same line", () => {
    for (const side of ["left", "right"] as const) {
      const ys = labels.filter((l) => l.side === side).map((l) => l.y).sort((a, b) => a - b);
      for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(40);
    }
  });
});
