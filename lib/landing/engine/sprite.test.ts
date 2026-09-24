import { describe, expect, it } from "vitest";

import { DRAW_POSTERS, drawingOf } from "./posters";
import { SPRITE_URL, SPRITE_VERSION, spriteSvg, symbolPaths } from "./sprite";

describe("the drawings' sprite (one static, cacheable SVG file)", () => {
  const svg = spriteSvg();

  it("is a standalone SVG with one symbol per drawing, each on its own viewBox", () => {
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
    const ids = [...svg.matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toEqual(DRAW_POSTERS.map((p) => `ep-${p.id}`));
    for (const p of DRAW_POSTERS) {
      expect(svg).toContain(`<symbol id="ep-${p.id}" viewBox="${drawingOf(p).viewBox.join(" ")}"`);
    }
  });

  it("is addressed by a version of its own content, so it can be cached forever", () => {
    expect(SPRITE_VERSION).toMatch(/^[0-9a-z]{6,}$/);
    expect(spriteSvg()).toBe(svg);
    expect(SPRITE_URL).toBe(`/engine/posters.svg?v=${SPRITE_VERSION}`);
  });

  it("draws with inherited colours only: lines in currentColor, fills and hues from custom properties", () => {
    expect(svg).not.toMatch(/#[0-9a-f]{6}/i);
    expect(svg).toContain('stroke="currentColor"');
    expect(svg).toContain("var(--ep-body)");
    expect(svg).toContain("var(--ep-h");
  });

  it("keeps each line's weight on screen, dashes hidden edges and ghosts a station's other modules", () => {
    const station = DRAW_POSTERS.find((p) => p.id === "st-models");
    if (!station) throw new Error("no station poster");
    const paths = symbolPaths(station);
    expect(paths.length).toBeGreaterThan(0);
    for (const p of paths) expect(p.attrs["vector-effect"]).toBe("non-scaling-stroke");
    expect(paths.some((p) => p.attrs["stroke-dasharray"] === "4 3")).toBe(true);
    expect(paths.some((p) => Number(p.attrs.opacity) < 0.5)).toBe(true);
  });
});
