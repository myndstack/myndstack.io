import { describe, expect, it } from "vitest";
import {
  CAPSULE_OFF_PX,
  CAPSULE_ON_PX,
  INITIAL_NAV_STATE,
  nextNavState,
  TUCK_AFTER_PX,
  type NavState,
} from "./nav-state";

/** Replays a scroll path and returns the state after the last position. */
function scrollThrough(positions: number[], from: NavState = INITIAL_NAV_STATE) {
  return positions.reduce(nextNavState, from);
}

describe("capsule threshold", () => {
  it("stays a bar below the on-threshold", () => {
    expect(scrollThrough([0, 40, 80, CAPSULE_ON_PX]).capsule).toBe(false);
  });

  it("becomes a capsule past the on-threshold", () => {
    expect(scrollThrough([0, CAPSULE_ON_PX + 1]).capsule).toBe(true);
  });

  it("does not release until below the off-threshold", () => {
    // The whole point of hysteresis: between OFF and ON nothing changes, so
    // hovering around one boundary can't restart the morph.
    const engaged = scrollThrough([0, 200]);
    expect(engaged.capsule).toBe(true);

    const between = scrollThrough([CAPSULE_OFF_PX + 1], engaged);
    expect(between.capsule).toBe(true);

    expect(scrollThrough([CAPSULE_OFF_PX - 1], between).capsule).toBe(false);
  });

  it("does not oscillate when scrolling across the dead band repeatedly", () => {
    let state = scrollThrough([0, 200]);
    for (let i = 0; i < 20; i++) {
      state = scrollThrough([CAPSULE_OFF_PX + 5, CAPSULE_ON_PX - 5], state);
      expect(state.capsule).toBe(true);
    }
  });
});

describe("tucking", () => {
  it("hides only after sustained downward travel past the floor", () => {
    // Far enough down, but crept there in small steps that never accumulate.
    const crept = scrollThrough([0, TUCK_AFTER_PX + 10]);
    expect(crept.capsule).toBe(true);

    const sustained = scrollThrough([TUCK_AFTER_PX + 200], crept);
    expect(sustained.tucked).toBe(true);
  });

  it("never hides above the floor however far you scroll", () => {
    const state = scrollThrough([0, TUCK_AFTER_PX - 10]);
    expect(state.tucked).toBe(false);
  });

  it("ignores momentum wobble", () => {
    // This is the regression that made the nav look like it was jittering:
    // reacting to instantaneous direction meant trackpad overscroll flipped it.
    let state = scrollThrough([0, 400, 700]);
    expect(state.tucked).toBe(true);

    for (const y of [690, 705, 692, 710, 698]) {
      state = nextNavState(state, y);
      expect(state.tucked).toBe(true);
    }
  });

  it("returns on a decisive scroll up", () => {
    const tucked = scrollThrough([0, 400, 700]);
    expect(tucked.tucked).toBe(true);
    expect(scrollThrough([600], tucked).tucked).toBe(false);
  });

  it("returns as soon as you get back above the floor", () => {
    const tucked = scrollThrough([0, 400, 700]);
    expect(scrollThrough([TUCK_AFTER_PX - 1], tucked).tucked).toBe(false);
  });
});

describe("purity", () => {
  it("does not mutate the previous state", () => {
    const before = { ...INITIAL_NAV_STATE };
    nextNavState(INITIAL_NAV_STATE, 500);
    expect(INITIAL_NAV_STATE).toEqual(before);
  });
});
