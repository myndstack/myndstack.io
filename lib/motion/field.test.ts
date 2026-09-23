import { describe, expect, it } from "vitest";

import { budgetFor, createField, mulberry32, stepField, waveform } from "@/lib/motion/field";

describe("mulberry32", () => {
  it("is deterministic and in [0, 1)", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("budgetFor", () => {
  const base = { width: 1440, coarse: false, cores: 8, saveData: false, reducedMotion: false, automated: false };
  it("scales with the device", () => {
    expect(budgetFor(base)).toBe(900);
    expect(budgetFor({ ...base, cores: 6 })).toBe(600);
    expect(budgetFor({ ...base, width: 900, coarse: true })).toBe(300);
    expect(budgetFor({ ...base, width: 390, coarse: true })).toBe(140);
  });
  it("halves on ≤4 cores", () => {
    expect(budgetFor({ ...base, cores: 4 })).toBe(300);
  });
  it("is zero for save-data, reduced motion and automation", () => {
    expect(budgetFor({ ...base, saveData: true })).toBe(0);
    expect(budgetFor({ ...base, reducedMotion: true })).toBe(0);
    expect(budgetFor({ ...base, automated: true })).toBe(0);
  });
});

describe("field", () => {
  it("is deterministic for a seed", () => {
    const a = createField(50, 7);
    const b = createField(50, 7);
    expect(Array.from(a.radius)).toEqual(Array.from(b.radius));
    expect(Array.from(a.angle)).toEqual(Array.from(b.angle));
  });

  it("spirals inward and respawns outside, staying in bounds", () => {
    const f = createField(200, 1);
    for (let i = 0; i < 600; i++) stepField(f, 16, { energy: 1 });
    for (let i = 0; i < f.count; i++) {
      expect(f.radius[i]).toBeGreaterThanOrEqual(f.inner - 1e-6);
      expect(f.radius[i]).toBeLessThanOrEqual(f.outer + 0.35);
      expect(Number.isFinite(f.angle[i])).toBe(true);
    }
  });

  it("does nothing with zero energy", () => {
    const f = createField(10, 1);
    const before = Array.from(f.radius);
    stepField(f, 16, { energy: 0 });
    expect(Array.from(f.radius)).toEqual(before);
  });
});

describe("waveform", () => {
  it("is symmetric about the centre bar and within [0, 1]", () => {
    const n = 41;
    for (let i = 0; i < n; i++) {
      const v = waveform(1234, i, n);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      expect(v).toBeCloseTo(waveform(1234, n - 1 - i, n), 9);
    }
  });
});
