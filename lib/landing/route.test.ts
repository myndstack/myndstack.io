import { describe, expect, it } from "vitest";

import { LANDING_PREVIEW_PATH, homeHash, isLandingPath } from "@/lib/landing/route";

describe("homeHash", () => {
  it("keeps a root anchor on the page when already on a landing page", () => {
    expect(homeHash("/#pricing", "/")).toBe("#pricing");
    expect(homeHash("/#pricing", LANDING_PREVIEW_PATH)).toBe("#pricing");
  });

  it("points back to the homepage from anywhere else", () => {
    expect(homeHash("/#pricing", "/careers")).toBe("/#pricing");
    expect(homeHash("/#pricing", null)).toBe("/#pricing");
  });

  it("leaves real paths alone", () => {
    expect(homeHash("/work", LANDING_PREVIEW_PATH)).toBe("/work");
    expect(homeHash("/careers", "/")).toBe("/careers");
  });
});

describe("isLandingPath", () => {
  it("recognises the homepage and the preview", () => {
    expect(isLandingPath("/")).toBe(true);
    expect(isLandingPath(LANDING_PREVIEW_PATH)).toBe(true);
    expect(isLandingPath("/work")).toBe(false);
    expect(isLandingPath(null)).toBe(false);
  });
});
