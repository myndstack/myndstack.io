/**
 * The Core's particle field: glowing points spiralling into the ring, drawn on
 * a canvas. This file is the simulation only — seeded, allocation-free per
 * frame, no DOM — so it's unit-tested and identical in every run.
 *
 * Positions live in ring units (1 = the arc radius). Typed arrays are updated
 * in place: this runs every frame for hundreds of points, the one place in the
 * codebase where mutation is the right trade-off.
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

export type DeviceProfile = {
  readonly width: number;
  readonly coarse: boolean;
  readonly cores: number;
  readonly saveData: boolean;
  readonly reducedMotion: boolean;
  /** navigator.webdriver — e2e runs get no particles unless a test opts in. */
  readonly automated: boolean;
};

/** How many particles this device gets. */
export function budgetFor(d: DeviceProfile): number {
  if (d.saveData || d.reducedMotion || d.automated) return 0;
  let base: number;
  if (d.width < 560) base = 140;
  else if (d.coarse || d.width < 1100) base = 300;
  else base = d.cores >= 8 ? 900 : 600;
  return d.cores <= 4 ? Math.round(base / 2) : base;
}

export type Field = {
  readonly count: number;
  /** Particles respawn between `outer` and `outer + 0.3`… */
  readonly outer: number;
  /** …and are recycled once they fall inside `inner`. */
  readonly inner: number;
  readonly angle: Float32Array;
  readonly radius: Float32Array;
  /** Per-particle speed multiplier. */
  readonly speed: Float32Array;
  /** Previous positions (for the short trail), in ring units. */
  readonly px: Float32Array;
  readonly py: Float32Array;
  readonly rand: () => number;
};

export function createField(count: number, seed: number): Field {
  const rand = mulberry32(seed);
  const field: Field = {
    count,
    outer: 1.25,
    inner: 0.82,
    angle: new Float32Array(count),
    radius: new Float32Array(count),
    speed: new Float32Array(count),
    px: new Float32Array(count),
    py: new Float32Array(count),
    rand,
  };
  for (let i = 0; i < count; i++) {
    field.angle[i] = rand() * Math.PI * 2;
    // Spread the initial ring so the field doesn't pulse in on the first frames.
    field.radius[i] = field.inner + rand() * (field.outer + 0.3 - field.inner);
    field.speed[i] = 0.6 + rand() * 0.8;
    field.px[i] = Math.cos(field.angle[i]) * field.radius[i];
    field.py[i] = Math.sin(field.angle[i]) * field.radius[i];
  }
  return field;
}

export type FieldParams = {
  /** 0 = frozen, 1 = normal flow. Scales both inflow and swirl. */
  readonly energy: number;
};

/** Advance the simulation by `dtMs`. Inward drift plus a swirl that tightens near the ring. */
export function stepField(f: Field, dtMs: number, { energy }: FieldParams): void {
  if (energy <= 0 || dtMs <= 0) return;
  const dt = (dtMs / 1000) * energy;
  for (let i = 0; i < f.count; i++) {
    const r = f.radius[i];
    f.px[i] = Math.cos(f.angle[i]) * r;
    f.py[i] = Math.sin(f.angle[i]) * r;
    const s = f.speed[i];
    f.radius[i] = r - 0.09 * s * dt;
    f.angle[i] += (0.35 * s * dt) / Math.max(0.5, r);
    if (f.radius[i] < f.inner) {
      f.radius[i] = f.outer + f.rand() * 0.3;
      f.angle[i] = f.rand() * Math.PI * 2;
      f.px[i] = Math.cos(f.angle[i]) * f.radius[i];
      f.py[i] = Math.sin(f.angle[i]) * f.radius[i];
    }
  }
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
