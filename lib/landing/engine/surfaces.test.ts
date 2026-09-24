import { describe, expect, it } from "vitest";

import { paperMask, toBands, toDeviceY } from "./surfaces";

const page = [
  { top: 0, bottom: 1900, kind: "ink" as const },
  { top: 1900, bottom: 6400, kind: "paper" as const },
  { top: 6400, bottom: 11000, kind: "graphite" as const },
  { top: 11000, bottom: 11990, kind: "ink" as const },
];

describe("toBands", () => {
  it("returns sorted, gap-free bands and merges neighbours of the same kind", () => {
    const bands = toBands([
      page[2],
      page[0],
      { top: 1900, bottom: 4000, kind: "paper" },
      { top: 4000, bottom: 6400, kind: "paper" },
      page[3],
    ]);
    expect(bands.map((b) => b.kind)).toEqual(["ink", "paper", "graphite", "ink"]);
    for (let i = 1; i < bands.length; i++) expect(bands[i].top).toBe(bands[i - 1].bottom);
  });

  it("closes a gap with the kind of the band above and clips overlaps", () => {
    const bands = toBands([
      { top: 0, bottom: 100, kind: "ink" },
      { top: 120, bottom: 300, kind: "paper" },
      { top: 250, bottom: 400, kind: "graphite" },
    ]);
    expect(bands).toEqual([
      { top: 0, bottom: 120, kind: "ink" },
      { top: 120, bottom: 300, kind: "paper" },
      { top: 300, bottom: 400, kind: "graphite" },
    ]);
  });

  it("drops empty sections", () => {
    expect(toBands([{ top: 10, bottom: 10, kind: "paper" }])).toEqual([]);
  });
});

describe("paperMask", () => {
  const bands = toBands(page);
  const out = new Float32Array(2);

  it("reports no edge and the right surface far from any paper", () => {
    const mask = paperMask(bands, 200, 900, out);
    expect(mask).toEqual({ topPaper: false, edges: 0 });
  });

  it("reports the scan line entering from below, in window-relative px", () => {
    const mask = paperMask(bands, 1400, 900, out);
    expect(mask).toEqual({ topPaper: false, edges: 1 });
    expect(out[0]).toBe(500);
  });

  it("reports paper at the top once the edge has passed above", () => {
    expect(paperMask(bands, 3000, 900, out)).toEqual({ topPaper: true, edges: 0 });
  });

  it("reports the paper's bottom edge on the way out", () => {
    const mask = paperMask(bands, 6000, 900, out);
    expect(mask).toEqual({ topPaper: true, edges: 1 });
    expect(out[0]).toBe(400);
  });

  it("reports both edges when a short paper band sits inside the window", () => {
    const short = toBands([
      { top: 0, bottom: 500, kind: "ink" },
      { top: 500, bottom: 800, kind: "paper" },
      { top: 800, bottom: 2000, kind: "ink" },
    ]);
    expect(paperMask(short, 300, 900, out)).toEqual({ topPaper: false, edges: 2 });
    expect([...out]).toEqual([200, 500]);
  });

  it("ignores ink ↔ graphite boundaries (CSS feathers those; the engine doesn't change)", () => {
    expect(paperMask(bands, 10600, 900, out)).toEqual({ topPaper: false, edges: 0 });
  });

  it("never reports more edges than the buffer holds", () => {
    const zebra = toBands(
      Array.from({ length: 10 }, (_, i) => ({ top: i * 100, bottom: (i + 1) * 100, kind: i % 2 ? ("paper" as const) : ("ink" as const) })),
    );
    expect(paperMask(zebra, 0, 900, out).edges).toBe(2);
  });
});

describe("toDeviceY", () => {
  it("lands every edge on an integer device row at every common pixel ratio", () => {
    for (const dpr of [1, 1.25, 1.5, 2, 3]) {
      for (const y of [0, 0.4, 123.5, 899.9]) {
        const d = toDeviceY(y, dpr, 900 * dpr, false);
        expect(Number.isInteger(d)).toBe(true);
        expect(Math.abs(d - y * dpr)).toBeLessThanOrEqual(0.5);
      }
    }
  });

  it("flips to WebGL's bottom-left origin", () => {
    expect(toDeviceY(0, 2, 1800, true)).toBe(1800);
    expect(toDeviceY(900, 2, 1800, true)).toBe(0);
    expect(toDeviceY(100, 1, 900, true)).toBe(800);
  });
});
