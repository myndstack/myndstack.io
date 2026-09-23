import { describe, expect, it } from "vitest";

import { countUp } from "@/lib/motion/countup";

describe("countUp", () => {
  it("returns the original string exactly at p = 1", () => {
    for (const v of ["114", "~29", "72%", "3.1x", "12ms", "₹4L", "2"]) {
      expect(countUp(v, 1)).toBe(v);
    }
  });

  it("starts at zero with the same prefix and suffix", () => {
    expect(countUp("114", 0)).toBe("0");
    expect(countUp("~29", 0)).toBe("~0");
    expect(countUp("72%", 0)).toBe("0%");
    expect(countUp("3.1x", 0)).toBe("0.0x");
  });

  it("interpolates, keeping the source's decimal places", () => {
    expect(countUp("114", 0.5)).toBe("57");
    expect(countUp("3.1x", 0.5)).toBe("1.6x");
  });

  it("leaves strings without a number untouched", () => {
    expect(countUp("n/a", 0.3)).toBe("n/a");
  });

  it("keeps thousands grouping in the source's style", () => {
    expect(countUp("1,00,000", 1)).toBe("1,00,000");
    expect(countUp("12,000", 0.5)).toBe("6,000");
  });
});
