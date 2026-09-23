import { describe, expect, it } from "vitest";

import { pipelineGeometry } from "@/lib/motion/pipeline-geometry";

const IDS = ["brief", "ai", "rules", "qa1", "qa2", "qa3", "approved"] as const;

describe("pipelineGeometry", () => {
  for (const layout of ["row", "column"] as const) {
    describe(layout, () => {
      const g = pipelineGeometry(IDS, layout, { width: 1000, height: 1000, pad: 50 });

      it("places every node in order along the path, first at 0 and last at 1", () => {
        expect(g.nodes.map((n) => n.id)).toEqual([...IDS]);
        expect(g.nodes[0].t).toBe(0);
        expect(g.nodes.at(-1)?.t).toBe(1);
        for (let i = 1; i < g.nodes.length; i++) {
          expect(g.nodes[i].t).toBeGreaterThan(g.nodes[i - 1].t);
        }
      });

      it("keeps every node inside the padded viewBox", () => {
        for (const n of g.nodes) {
          expect(n.x).toBeGreaterThanOrEqual(50);
          expect(n.x).toBeLessThanOrEqual(950);
          expect(n.y).toBeGreaterThanOrEqual(50);
          expect(n.y).toBeLessThanOrEqual(950);
        }
      });

      it("draws a path from the first node to the last", () => {
        const first = g.nodes[0];
        const last = g.nodes.at(-1)!;
        expect(g.d.startsWith(`M${first.x} ${first.y}`)).toBe(true);
        expect(g.d.endsWith(`${last.x} ${last.y}`)).toBe(true);
        expect(g.length).toBeGreaterThan(0);
      });

      it("is deterministic", () => {
        expect(pipelineGeometry(IDS, layout, { width: 1000, height: 1000, pad: 50 })).toEqual(g);
      });
    });
  }

  it("runs left→right in a row and top→bottom in a column", () => {
    const row = pipelineGeometry(IDS, "row", { width: 1000, height: 200, pad: 20 });
    const col = pipelineGeometry(IDS, "column", { width: 200, height: 1000, pad: 20 });
    expect(new Set(row.nodes.map((n) => n.y)).size).toBe(1);
    expect(new Set(col.nodes.map((n) => n.x)).size).toBe(1);
  });

  it("handles a single node without dividing by zero", () => {
    const g = pipelineGeometry(["only"], "row", { width: 100, height: 100, pad: 10 });
    expect(g.nodes[0].t).toBe(0);
    expect(Number.isFinite(g.length)).toBe(true);
  });
});
