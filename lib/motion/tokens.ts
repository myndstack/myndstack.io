/**
 * The motion tokens from `@theme` / `:root` in app/globals.css, as numbers
 * anime.js can use. tokens.test.ts reads globals.css and fails if these drift.
 */

/** `--ease-brand`: cubic-bezier(0.2, 0, 0, 1). */
export const EASE_BRAND = [0.2, 0, 0, 1] as const;

/** `--dur-*`, in milliseconds. */
export const DUR = {
  fast: 160,
  base: 300,
  slow: 600,
  draw: 900,
  build: 1400,
} as const;

/** Stagger between items in a sequence (matches Reveal's STAGGER_S). */
export const STAGGER_MS = 60;

/** Spring for pointer-following UI (magnetic CTAs). */
export const SPRING_UI = { stiffness: 220, damping: 18, mass: 1 } as const;
