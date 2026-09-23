/**
 * The motion and colour tokens from `@theme` / `:root` in app/globals.css, as
 * values anime.js and the canvas can use. tokens.test.ts reads globals.css and
 * fails if these drift.
 */

/** `--ease-brand`: cubic-bezier(0.2, 0, 0, 1). The default for UI. */
export const EASE_BRAND = [0.2, 0, 0, 1] as const;
/** `--ease-out-expo`: draws and entrances. */
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
/** `--ease-camera`: eased keyframes inside a scrubbed timeline. */
export const EASE_CAMERA = [0.83, 0, 0.17, 1] as const;
/** `--ease-exit`: exits, at ~0.66× the entrance duration. */
export const EASE_EXIT = [0.4, 0, 1, 1] as const;

/** `--dur-*`, in milliseconds. */
export const DUR = {
  press: 90,
  fast: 160,
  base: 300,
  slow: 600,
  draw: 900,
  build: 1400,
} as const;

/** Stagger between items in a sequence (matches Reveal's STAGGER_S). */
export const STAGGER_MS = 60;
/** Stagger rhythms for the landing: characters, list rows, arcs, blocks. */
export const STAGGER = { char: 25, list: 60, arc: 90, block: 120 } as const;

/** Spring for pointer-following UI (magnetic CTAs). */
export const SPRING_UI = { stiffness: 220, damping: 18, mass: 1 } as const;

/** The spectrum (`--color-spec-*`, and `--color-lime` for the brand arc). */
export const SPECTRUM = {
  lime: "#c9f24d",
  ai: "#a98bff",
  product: "#4fe3d6",
  design: "#ff6b5b",
  arch: "#ffb547",
} as const;

/** Paper-safe variants (`--color-spec-*-deep`, `--color-lime-deep`). */
export const SPECTRUM_DEEP = {
  lime: "#445c00",
  ai: "#4b2fc0",
  product: "#005a54",
  design: "#a0281c",
  arch: "#7a4a00",
} as const;

export type Hue = keyof typeof SPECTRUM;
