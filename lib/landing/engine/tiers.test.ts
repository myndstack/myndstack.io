import { describe, expect, it } from "vitest";

import { type DeviceProfile, TIERS, initialTier, tierAfter, tierParams } from "./tiers";

const desktop: DeviceProfile = {
  webgl2: true,
  software: false,
  saveData: false,
  reducedMotion: false,
  motionOff: false,
  forcedColors: false,
  automation: false,
  testOptIn: false,
  allowSoftware: false,
  pinned: true,
  coarse: false,
  cores: 10,
  memoryGb: 16,
};

describe("initialTier", () => {
  it("gives a capable desktop the high tier", () => {
    expect(initialTier(desktop)).toBe("high");
  });

  it("never renders for reduced motion, ?motion=off or forced colours — not even for a test opt-in", () => {
    for (const flag of ["reducedMotion", "motionOff", "forcedColors"] as const) {
      expect(initialTier({ ...desktop, [flag]: true })).toBe("poster");
      expect(initialTier({ ...desktop, [flag]: true, automation: true, testOptIn: true, allowSoftware: true }, "high")).toBe(
        "poster",
      );
    }
  });

  it("needs WebGL2", () => {
    expect(initialTier({ ...desktop, webgl2: false })).toBe("poster");
  });

  it("is off under automation unless a test opts in", () => {
    expect(initialTier({ ...desktop, automation: true })).toBe("poster");
    expect(initialTier({ ...desktop, automation: true, testOptIn: true })).toBe("high");
  });

  it("sends software renderers to posters unless a test explicitly allows them", () => {
    expect(initialTier({ ...desktop, software: true })).toBe("poster");
    expect(initialTier({ ...desktop, software: true, automation: true, testOptIn: true })).toBe("poster");
    expect(initialTier({ ...desktop, software: true, automation: true, testOptIn: true, allowSoftware: true })).toBe("high");
    // allowSoftware means nothing without the opt-in.
    expect(initialTier({ ...desktop, software: true, allowSoftware: true })).toBe("poster");
  });

  it("respects Save-Data", () => {
    expect(initialTier({ ...desktop, saveData: true })).toBe("poster");
  });

  it("gives phones, tablets and short screens the low tier", () => {
    expect(initialTier({ ...desktop, pinned: false, coarse: true })).toBe("low");
    expect(initialTier({ ...desktop, pinned: false })).toBe("low");
  });

  it("steps down on weak hardware when it is known", () => {
    expect(initialTier({ ...desktop, memoryGb: 2 })).toBe("low");
    expect(initialTier({ ...desktop, cores: 4 })).toBe("medium");
    expect(initialTier({ ...desktop, cores: undefined, memoryGb: undefined })).toBe("high");
  });

  it("lets a test force a tier, but only when opted in and never above what the rules allow", () => {
    expect(initialTier({ ...desktop, automation: true, testOptIn: true }, "low")).toBe("low");
    expect(initialTier(desktop, "low")).toBe("high");
    expect(initialTier({ ...desktop, automation: true, testOptIn: true, pinned: false }, "high")).toBe("low");
  });
});

describe("tierParams", () => {
  it("sheds cost monotonically from high to poster", () => {
    const order = TIERS.map((t) => tierParams(t, false));
    for (let i = 1; i < order.length; i++) {
      expect(order[i].dprCap).toBeLessThanOrEqual(order[i - 1].dprCap);
      expect(order[i].lod).toBeGreaterThanOrEqual(order[i - 1].lod);
      expect(order[i].ambientFps).toBeLessThanOrEqual(order[i - 1].ambientFps);
    }
    expect(tierParams("poster", false).dprCap).toBe(0);
  });

  it("lets phones keep a sharper low tier", () => {
    expect(tierParams("low", true).dprCap).toBe(1.5);
    expect(tierParams("low", false).dprCap).toBe(1);
  });
});

describe("tierAfter", () => {
  it("degrades one step at a time and never climbs back", () => {
    expect(tierAfter("high")).toBe("medium");
    expect(tierAfter("medium")).toBe("low");
    expect(tierAfter("low")).toBe("poster");
    expect(tierAfter("poster")).toBe("poster");
  });
});
