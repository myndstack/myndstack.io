import { advanceTravel, INITIAL_TRAVEL, type Travel } from "./scroll-travel";

/**
 * "Show it when they head back up" — the visibility rule for the back-to-top
 * button, as a pure reducer.
 *
 * Scrolling up is the intent signal: someone moving down the page is reading,
 * someone moving up is looking for something. The button stays out of the way
 * until then, which is also why it doesn't need to double as a progress
 * indicator — the left spine already shows that.
 */

/** Never show it near the top; the page header is right there. */
export const MIN_DEPTH_PX = 600;
/** Sustained upward travel before it appears. */
export const SHOW_DISTANCE_PX = 40;
/** Sustained downward travel before it goes away again. */
export const HIDE_DISTANCE_PX = 90;

export type ScrollIntent = Travel & { visible: boolean };

export const INITIAL_SCROLL_INTENT: ScrollIntent = {
  ...INITIAL_TRAVEL,
  visible: false,
};

export function nextScrollIntent(prev: ScrollIntent, y: number): ScrollIntent {
  const { lastY, travel } = advanceTravel(prev, y);

  let visible = prev.visible;
  if (y <= MIN_DEPTH_PX) {
    visible = false;
  } else if (!visible) {
    if (travel < -SHOW_DISTANCE_PX) visible = true;
  } else if (travel > HIDE_DISTANCE_PX) {
    visible = false;
  }

  return { lastY, travel, visible };
}
