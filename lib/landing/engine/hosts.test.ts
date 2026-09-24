import { describe, expect, it } from "vitest";

import { pickHost, stageShare, stageTop, visibleShare } from "./hosts";

const vh = 900;
const run = { top: 0, bottom: 12_000 };

describe("stageTop", () => {
  it("sticks at 0 for the whole run", () => {
    for (const y of [0, 1, 500, 11_100]) expect(stageTop(y, run, vh)).toBe(0);
  });

  it("scrolls away natively at the end of the run", () => {
    expect(stageTop(11_500, run, vh)).toBe(-400);
    expect(stageTop(12_000, run, vh)).toBe(-900);
  });

  it("sits below the viewport top before a run that starts lower down", () => {
    expect(stageTop(100, { top: 600, bottom: 5000 }, vh)).toBe(500);
  });

  it("is continuous across the release point", () => {
    const release = run.bottom - vh;
    expect(stageTop(release - 0.5, run, vh)).toBeCloseTo(0, 5);
    expect(stageTop(release + 0.5, run, vh)).toBeCloseTo(-0.5, 5);
  });
});

describe("shares", () => {
  it("measures how much of a host is on screen, relative to what could be", () => {
    const dock = { top: 13_000, bottom: 13_260 };
    expect(visibleShare(dock, 12_000, vh)).toBe(0);
    expect(visibleShare(dock, 12_230, vh)).toBeCloseTo(0.5, 5);
    expect(visibleShare(dock, 12_600, vh)).toBe(1);
    // A host taller than the viewport is fully "visible" when it fills the screen.
    expect(visibleShare({ top: 0, bottom: 3000 }, 1000, vh)).toBe(1);
  });

  it("measures the stage while it scrolls away", () => {
    expect(stageShare(0, run, vh)).toBe(1);
    expect(stageShare(11_550, run, vh)).toBeCloseTo(0.5, 5);
    expect(stageShare(12_100, run, vh)).toBe(0);
  });
});

describe("pickHost", () => {
  it("keeps the current host while enough of it is visible (no flapping)", () => {
    expect(pickHost([{ id: "stage", share: 0.25 }, { id: "dock", share: 0.9 }], "stage")).toBe("stage");
  });

  it("hands over once the current host is nearly gone", () => {
    expect(pickHost([{ id: "stage", share: 0.1 }, { id: "dock", share: 0.9 }], "stage")).toBe("dock");
  });

  it("needs a newcomer to be well on screen before it takes over", () => {
    expect(pickHost([{ id: "stage", share: 0 }, { id: "dock", share: 0.3 }], "stage")).toBe(null);
    expect(pickHost([{ id: "stage", share: 0 }, { id: "dock", share: 0.36 }], "stage")).toBe("dock");
  });

  it("picks the most visible newcomer, and a stable winner on ties", () => {
    expect(pickHost([{ id: "a", share: 0.6 }, { id: "b", share: 0.8 }], null)).toBe("b");
    expect(pickHost([{ id: "a", share: 0.8 }, { id: "b", share: 0.8 }], null)).toBe("a");
  });

  it("returns null when nothing is on screen", () => {
    expect(pickHost([], "stage")).toBe(null);
    expect(pickHost([{ id: "a", share: 0 }], "a")).toBe(null);
  });
});
