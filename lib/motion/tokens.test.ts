import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { DUR, EASE_BRAND } from "@/lib/motion/tokens";

// The motion constants anime.js uses must be the ones CSS uses, or JS-driven
// and CSS-driven motion drift apart. Read them straight out of globals.css.
const css = readFileSync(fileURLToPath(new URL("../../app/globals.css", import.meta.url)), "utf8");

const cssVar = (name: string): string => {
  const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(css);
  if (!match) throw new Error(`--${name} not found in globals.css`);
  return match[1].trim();
};

const ms = (value: string): number =>
  value.endsWith("ms") ? Number(value.slice(0, -2)) : Number(value.slice(0, -1)) * 1000;

describe("motion tokens mirror globals.css", () => {
  it("uses the brand easing curve", () => {
    const points = cssVar("ease-brand")
      .replace(/^cubic-bezier\(|\)$/g, "")
      .split(",")
      .map((n) => Number(n.trim()));
    expect(points).toEqual([...EASE_BRAND]);
  });

  it("uses the same durations", () => {
    for (const [name, value] of Object.entries(DUR)) {
      expect(ms(cssVar(`dur-${name}`)), name).toBe(value);
    }
  });
});
