"use client";

/**
 * One rAF-throttled scroll listener for the whole page.
 *
 * The spine fill, nav morph, scroll-spy, back-to-top ring and the pinned stack
 * story all read the same frame — adding a `window.addEventListener("scroll")`
 * per component would run the same layout reads several times per frame.
 *
 * Two rules keep the frame cheap, and both exist because breaking them cost
 * real frames on a phone:
 *
 * 1. **The frame does no layout reads.** Document height is cached and
 *    refreshed by a ResizeObserver, not measured 60 times a second —
 *    `scrollHeight` was the first read of every frame and the most expensive
 *    one on a 17-section page. `window.scrollY` is the only survivor, and it
 *    reads the scroll position rather than forcing layout.
 * 2. **Reads and writes are separate phases.** A subscriber that measured after
 *    another had written a class forced a synchronous layout, once per
 *    subscriber per frame. Anything that must measure registers `read`;
 *    everything that mutates registers `write`; all reads run before any write.
 */

export type ScrollState = {
  /** window.scrollY */
  y: number;
  /** 0→1 progress through the whole document */
  progress: number;
};

type Phase = (state: ScrollState) => void;

/**
 * A bare function is treated as write-only — that is what most subscribers are,
 * and it keeps them from having to think about phases at all.
 */
export type ScrollSubscriber = Phase | { read?: Phase; write?: Phase };

type Entry = { read?: Phase; write?: Phase };

const entries = new Set<Entry>();

const state: ScrollState = { y: 0, progress: 0 };
let frame = 0;
let boundsFrame = 0;
let attached = false;
let bounds: ResizeObserver | null = null;

/** Cached `scrollHeight - innerHeight`. Refreshed on resize, never per frame. */
let maxScroll = 0;

function refreshBounds() {
  maxScroll = Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight,
  );
}

/**
 * Re-measure once layout has settled, then re-dispatch: progress is a fraction
 * of document height, so it changes when the document grows even if nobody
 * scrolled.
 */
function scheduleBounds() {
  if (boundsFrame) return;
  boundsFrame = requestAnimationFrame(() => {
    boundsFrame = 0;
    refreshBounds();
    measure();
  });
}

function measure() {
  state.y = window.scrollY;
  state.progress =
    maxScroll > 0 ? Math.min(1, Math.max(0, state.y / maxScroll)) : 0;

  for (const entry of entries) entry.read?.(state);
  for (const entry of entries) entry.write?.(state);
}

function onScroll() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    measure();
  });
}

/** Subscribe to scroll frames. Returns an unsubscribe function. */
export function subscribeToScroll(subscriber: ScrollSubscriber): () => void {
  const entry: Entry =
    typeof subscriber === "function" ? { write: subscriber } : subscriber;
  entries.add(entry);

  if (!attached) {
    attached = true;
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", scheduleBounds, { passive: true });

    // Catches document growth that no resize event reports — reveals landing,
    // fonts swapping, the loader clearing.
    bounds = new ResizeObserver(scheduleBounds);
    bounds.observe(document.body);

    refreshBounds();
  }

  // Give the new subscriber a frame so it renders correctly on mount — notably
  // the back-to-top button, which is focusable until told otherwise. Scheduled
  // rather than run inline: five subscribers mount during hydration, and this
  // way one pass serves all of them instead of five full dispatches.
  onScroll();

  return () => {
    entries.delete(entry);
    if (entries.size === 0) {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", scheduleBounds);
      bounds?.disconnect();
      bounds = null;
      if (frame) cancelAnimationFrame(frame);
      if (boundsFrame) cancelAnimationFrame(boundsFrame);
      frame = 0;
      boundsFrame = 0;
      attached = false;
    }
  };
}
