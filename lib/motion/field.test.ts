import { describe, expect, it } from "vitest";

import { mulberry32, waveform } from "@/lib/motion/field";

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
