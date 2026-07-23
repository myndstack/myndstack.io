import { advanceTravel, type Travel } from "./scroll-travel";

/**
 * The nav's bar → capsule → hidden state machine, as a pure reducer.
 *
 * Extracted from the component so it can be unit-tested: this logic regressed
 * twice during development and is painful to verify through a real browser,
 * because it only expresses itself across a sequence of scroll frames.
 */

/**
 * Separate on/off thresholds. With a single boundary, scrolling around it
 * re-triggers the whole morph every few pixels, which reads as stuttering.
 */
export const CAPSULE_ON_PX = 90;
export const CAPSULE_OFF_PX = 50;

/** Above this the capsule never hides, however you scroll. */
export const TUCK_AFTER_PX = 220;

/**
 * Sustained travel required before the capsule hides or returns. Reacting to
 * instantaneous direction let trackpad momentum flip it back and forth.
 */
export const TUCK_DISTANCE_PX = 90;
export const UNTUCK_DISTANCE_PX = 40;

export type NavState = Travel & {
  capsule: boolean;
  tucked: boolean;
};

export const INITIAL_NAV_STATE: NavState = {
  capsule: false,
  tucked: false,
  lastY: 0,
  travel: 0,
};

/** Advances the nav state for a scroll position. Never mutates `prev`. */
export function nextNavState(prev: NavState, y: number): NavState {
  let capsule = prev.capsule;
  if (!capsule && y > CAPSULE_ON_PX) capsule = true;
  else if (capsule && y < CAPSULE_OFF_PX) capsule = false;

  const { lastY, travel } = advanceTravel(prev, y);

  let tucked = prev.tucked;
  if (!tucked) {
    if (capsule && y > TUCK_AFTER_PX && travel > TUCK_DISTANCE_PX) tucked = true;
  } else if (travel < -UNTUCK_DISTANCE_PX || y < TUCK_AFTER_PX) {
    tucked = false;
  }

  return { capsule, tucked, lastY, travel };
}
