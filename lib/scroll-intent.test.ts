import { describe, expect, it } from "vitest";
import {
  INITIAL_SCROLL_INTENT,
  MIN_DEPTH_PX,
  nextScrollIntent,
  type ScrollIntent,
} from "./scroll-intent";

/** Replays a scroll path and returns the state after the last position. */
function scrollThrough(positions: number[], from: ScrollIntent = INITIAL_SCROLL_INTENT) {
  return positions.reduce(nextScrollIntent, from);
}

describe("visibility", () => {
  it("stays hidden while scrolling down", () => {
    expect(scrollThrough([0, 400, 900, 1600, 2400]).visible).toBe(false);
  });

  it("appears on a sustained scroll up", () => {
    const down = scrollThrough([0, 2400]);
    expect(down.visible).toBe(false);
    expect(scrollThrough([2300], down).visible).toBe(true);
  });

  it("hides again once you resume scrolling down", () => {
    const shown = scrollThrough([0, 2400, 2300]);
    expect(shown.visible).toBe(true);
    expect(scrollThrough([2450], shown).visible).toBe(false);
  });

  it("never shows near the top of the page", () => {
    // Scrolling up from just under the threshold must not summon it.
    const state = scrollThrough([0, MIN_DEPTH_PX - 50, MIN_DEPTH_PX - 400]);
    expect(state.visible).toBe(false);
  });

  it("hides when you arrive back at the top", () => {
    const shown = scrollThrough([0, 2400, 2300]);
    expect(shown.visible).toBe(true);
    expect(scrollThrough([MIN_DEPTH_PX], shown).visible).toBe(false);
  });
});

describe("momentum immunity", () => {
  it("is not summoned by small upward jitter", () => {
    // Overscroll bounce and trackpad easing both reverse sign for a frame or
    // two; a bare direction check would flash the button on every wobble.
    let state = scrollThrough([0, 2400]);
    for (const y of [2395, 2402, 2388, 2405, 2392]) {
      state = nextScrollIntent(state, y);
      expect(state.visible).toBe(false);
    }
  });

  it("is not dismissed by small downward jitter once shown", () => {
    let state = scrollThrough([0, 2400, 2280]);
    expect(state.visible).toBe(true);

    for (const y of [2290, 2275, 2300, 2285, 2310]) {
      state = nextScrollIntent(state, y);
      expect(state.visible).toBe(true);
    }
  });
});

describe("purity", () => {
  it("does not mutate the previous state", () => {
    const before = { ...INITIAL_SCROLL_INTENT };
    nextScrollIntent(INITIAL_SCROLL_INTENT, 2000);
    expect(INITIAL_SCROLL_INTENT).toEqual(before);
  });
});
