"use client";

/**
 * One rAF-throttled scroll listener for the whole page.
 *
 * The spine fill, nav morph, scroll-spy, back-to-top ring and the pinned stack
 * story all read the same frame — adding a `window.addEventListener("scroll")`
 * per component would run the same layout reads several times per frame.
 */

export type ScrollState = {
  /** window.scrollY */
  y: number;
  /** 0→1 progress through the whole document */
  progress: number;
};

type Listener = (state: ScrollState) => void;

const listeners = new Set<Listener>();

const state: ScrollState = { y: 0, progress: 0 };
let frame = 0;
let attached = false;

function measure() {
  const doc = document.documentElement;
  const max = doc.scrollHeight - window.innerHeight;

  state.y = window.scrollY;
  state.progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;

  for (const listener of listeners) listener(state);
}

function onScroll() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    measure();
  });
}

/** Subscribe to scroll frames. Returns an unsubscribe function. */
export function subscribeToScroll(listener: Listener): () => void {
  listeners.add(listener);

  if (!attached) {
    attached = true;
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
  }

  // Give the new subscriber a frame immediately so it renders correctly on
  // mount — notably the back-to-top button, which is focusable until told
  // otherwise.
  measure();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      attached = false;
    }
  };
}
