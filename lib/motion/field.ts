/**
 * Small seeded helpers shared by the Core's drawings: a PRNG for anything that
 * must look random yet render identically on every run (and in tests), and
 * the Core's inner waveform. Pure, no DOM.
 */

/** Small, fast, seedable PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Height (0–1) of bar `i` of `n` in the Core's inner waveform at time `t` ms:
 * a bell envelope, breathing. Symmetric about the centre bar by construction.
 */
export function waveform(t: number, i: number, n: number): number {
  const centre = (n - 1) / 2;
  const d = centre === 0 ? 0 : Math.abs(i - centre) / centre;
  const envelope = Math.exp(-d * d * 3.2);
  const breathe = 0.62 + 0.38 * Math.sin(t / 900 + d * 5.1) * Math.cos(t / 1600 - d * 2.3);
  const v = envelope * breathe;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
