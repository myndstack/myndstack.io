import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  DUR,
  EASE_BRAND,
  EASE_CAMERA,
  EASE_EXIT,
  EASE_OUT_EXPO,
  SPECTRUM,
  SPECTRUM_DEEP,
} from "@/lib/motion/tokens";

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

const bezier = (name: string): number[] =>
  cssVar(name)
    .replace(/^cubic-bezier\(|\)$/g, "")
    .split(",")
    .map((n) => Number(n.trim()));

describe("motion tokens mirror globals.css", () => {
  it("uses the same easing curves", () => {
    expect(bezier("ease-brand")).toEqual([...EASE_BRAND]);
    expect(bezier("ease-out-expo")).toEqual([...EASE_OUT_EXPO]);
    expect(bezier("ease-camera")).toEqual([...EASE_CAMERA]);
    expect(bezier("ease-exit")).toEqual([...EASE_EXIT]);
  });

  it("uses the same durations", () => {
    for (const [name, value] of Object.entries(DUR)) {
      expect(ms(cssVar(`dur-${name}`)), name).toBe(value);
    }
  });
});

describe("spectrum tokens mirror globals.css", () => {
  it("uses the same hues", () => {
    expect(cssVar("color-lime").toLowerCase()).toBe(SPECTRUM.lime);
    for (const key of ["ai", "product", "design", "arch"] as const) {
      expect(cssVar(`color-spec-${key}`).toLowerCase(), key).toBe(SPECTRUM[key]);
      expect(cssVar(`color-spec-${key}-deep`).toLowerCase(), `${key}-deep`).toBe(SPECTRUM_DEEP[key]);
    }
    expect(cssVar("color-lime-deep").toLowerCase()).toBe(SPECTRUM_DEEP.lime);
  });

  it("keeps every deep variant readable on paper (≥ 4.5:1)", () => {
    const paper = cssVar("color-paper");
    for (const [key, hex] of Object.entries(SPECTRUM_DEEP)) {
      expect(contrast(hex, paper), key).toBeGreaterThanOrEqual(4.5);
    }
  });
});

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
