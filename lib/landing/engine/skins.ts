/**
 * The landing's three skins — one token set, three ways of seeing the engine:
 *
 * - MACHINED, the studio: near-black, the engine in anodised metal.
 * - DRAFTING, the sheet: warm paper, the engine in ink.
 * - SIGNAL, inside the bore (the capabilities chamber): the darkest black,
 *   lit only by the accent.
 *
 * components/landing/styles/skins.css carries the same values as `--skin-*`
 * (skins.test.ts keeps them equal), and the renderer reads them from here —
 * so the canvas's clear colour is the page's background by construction.
 * Surfaces only ever change at a lime front (scenes.ts).
 */

export const SKINS = ["machined", "drafting", "signal"] as const;
export type Skin = (typeof SKINS)[number];

export type SkinTokens = {
  /** The page background (= the WebGL clear colour). */
  readonly base: string;
  readonly card: string;
  readonly raised: string;
  readonly inset: string;
  /** Hairline and strong rule. */
  readonly line: string;
  readonly rule: string;
  /** Titles, body, the quiet half of a two-tone title, mono labels. */
  readonly text1: string;
  readonly text2: string;
  readonly text3: string;
  readonly mute: string;
  /** Lime as text on this skin (lime-deep on paper: raw lime is 1.1:1 there). */
  readonly accent: string;
  readonly focus: string;
};

export const SKIN: Readonly<Record<Skin, SkinTokens>> = {
  machined: {
    base: "#0a0a0b",
    card: "#111214",
    raised: "#17181b",
    inset: "#0d0e10",
    line: "rgb(255 255 255 / 0.07)",
    rule: "rgb(255 255 255 / 0.14)",
    text1: "#f4f4f6",
    text2: "#c7c7ce",
    text3: "#9a9aa2",
    mute: "#83838c",
    accent: "#c9f24d",
    focus: "#c9f24d",
  },
  drafting: {
    base: "#d9d7d1",
    card: "#e4e2dc",
    raised: "#eceae5",
    inset: "#d2d0c9",
    line: "rgb(10 10 11 / 0.14)",
    rule: "rgb(10 10 11 / 0.32)",
    text1: "#0a0a0b",
    text2: "#3d3d42",
    text3: "#4a4b52",
    mute: "#55565d",
    accent: "#445c00",
    focus: "#0a0a0b",
  },
  signal: {
    base: "#060708",
    card: "#0c0d0f",
    raised: "#121316",
    inset: "#08090a",
    line: "rgb(255 255 255 / 0.06)",
    rule: "rgb(255 255 255 / 0.12)",
    text1: "#f4f4f6",
    text2: "#c7c7ce",
    text3: "#9a9aa2",
    mute: "#86868f",
    accent: "#c9f24d",
    focus: "#c9f24d",
  },
};

/** Tokens skins.css must carry, per skin. */
export const CSS_TOKENS = [
  "base",
  "card",
  "raised",
  "inset",
  "line",
  "rule",
  "text1",
  "text2",
  "text3",
  "mute",
  "accent",
  "focus",
] as const satisfies readonly (keyof SkinTokens)[];

export const SURFACES = ["base", "card", "raised", "inset"] as const satisfies readonly (keyof SkinTokens)[];
export const TEXT_ROLES = ["text1", "text2", "text3", "mute", "accent"] as const satisfies readonly (keyof SkinTokens)[];

/** `#rrggbb` → [r, g, b, a] in 0–1 (the renderer's uniforms). */
export function rgba(hex: string): readonly [number, number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
}

const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (hex: string) => {
  const [r, g, b] = rgba(hex);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
};

/** WCAG contrast ratio of two opaque `#rrggbb` colours. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
