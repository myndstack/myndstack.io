import { describe, expect, it } from "vitest";

import { CORE } from "@/lib/motion/core-geometry";
import { sameSkeleton } from "@/lib/motion/paths";
import { DESIGN_DEMO, NEURAL, PIPELINE_DEMO, PRODUCT_DEMO, type Box } from "@/lib/landing/demo-geometry";

/** Every demo must sit inside the ring's inner circle (with a margin). */
const LIMIT = CORE.rInner - 12;
const inside = (x: number, y: number) => Math.hypot(x - CORE.cx, y - CORE.cy) <= LIMIT;
const boxInside = (b: Box) =>
  inside(b.x, b.y) && inside(b.x + b.w, b.y) && inside(b.x, b.y + b.h) && inside(b.x + b.w, b.y + b.h);

describe("demo geometry fits inside the Core", () => {
  it("neural graph", () => {
    for (const layer of NEURAL.layers) for (const n of layer) expect(inside(n.x, n.y)).toBe(true);
    expect(boxInside(NEURAL.gate)).toBe(true);
    expect(NEURAL.edges.length).toBeGreaterThan(20);
  });

  it("product: phone and desktop layouts", () => {
    for (const block of PRODUCT_DEMO.blocks) {
      expect(boxInside(block.phone), `${block.id} phone`).toBe(true);
      expect(boxInside(block.desktop), `${block.id} desktop`).toBe(true);
    }
    expect(boxInside(PRODUCT_DEMO.frame.phone)).toBe(true);
    expect(boxInside(PRODUCT_DEMO.frame.desktop)).toBe(true);
  });

  it("design: tangle and circuit morph exactly and stay inside", () => {
    expect(sameSkeleton(DESIGN_DEMO.tangle, DESIGN_DEMO.circuit)).toBe(true);
    for (const p of DESIGN_DEMO.nodes) expect(inside(p.x, p.y)).toBe(true);
    const nums = (d: string) => (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
    for (const d of [DESIGN_DEMO.tangle, DESIGN_DEMO.circuit]) {
      const n = nums(d);
      for (let i = 0; i < n.length; i += 2) expect(inside(n[i], n[i + 1])).toBe(true);
    }
  });

  it("pipeline stations", () => {
    for (const s of PIPELINE_DEMO.stations) expect(boxInside(s)).toBe(true);
    expect(PIPELINE_DEMO.stations.map((s) => s.label)).toEqual(["COMMIT", "CI", "DEPLOY", "PROD"]);
  });
});
