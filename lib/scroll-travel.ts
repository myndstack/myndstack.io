/**
 * Distance travelled since the last direction change.
 *
 * Scroll-reactive chrome that responds to instantaneous direction flickers
 * constantly, because trackpad momentum and smooth-scroll easing both reverse
 * sign for a frame or two. Accumulating travel and acting on a distance
 * threshold is what makes those components feel deliberate instead of twitchy.
 *
 * Shared by the nav morph and the back-to-top button so the behaviour — and the
 * bug it fixes — can't drift apart between them.
 */
export type Travel = {
  /** Previous scroll offset, for deriving this frame's delta. */
  lastY: number;
  /** Signed distance travelled in the current direction. */
  travel: number;
};

export const INITIAL_TRAVEL: Travel = { lastY: 0, travel: 0 };

export function advanceTravel(prev: Travel, y: number): Travel {
  const delta = y - prev.lastY;
  if (delta === 0) return { lastY: y, travel: prev.travel };

  // Direction reversed? Start counting again from here.
  const travel = (delta > 0 !== prev.travel > 0 ? 0 : prev.travel) + delta;
  return { lastY: y, travel };
}
