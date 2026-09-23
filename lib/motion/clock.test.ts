import { describe, expect, it } from "vitest";

import { formatIst, msToNextMinute } from "@/lib/motion/clock";

describe("formatIst", () => {
  it("formats UTC+5:30 as HH:MM, 24h", () => {
    expect(formatIst(Date.UTC(2026, 8, 23, 9, 2, 59))).toBe("14:32");
    expect(formatIst(Date.UTC(2026, 8, 23, 18, 30, 0))).toBe("00:00");
    expect(formatIst(Date.UTC(2026, 8, 23, 18, 29, 0))).toBe("23:59");
  });
});

describe("msToNextMinute", () => {
  it("aligns updates to the minute boundary", () => {
    expect(msToNextMinute(Date.UTC(2026, 0, 1, 0, 0, 59, 500))).toBe(500);
    expect(msToNextMinute(Date.UTC(2026, 0, 1, 0, 0, 0, 0))).toBe(60_000);
  });
});
