import type { ReactNode } from "react";

import CoreRingMini from "../core/CoreRingMini";

/**
 * The engine's bezel and the small dial — kept apart from Posters.tsx so a
 * client component (the FAQ) can show a dial without shipping the drawing
 * generator behind the posters.
 */

/** The bezel around the Core (CORE's 1000 box is the face's radius 2.1; the bezel runs to 2.3). */
export function Bezel() {
  return (
    <svg className="engine-bezel" viewBox="0 0 1000 1000" aria-hidden="true" focusable="false">
      <circle cx="500" cy="500" r="530" className="engine-bezel-knurl" />
      <circle cx="500" cy="500" r="547" className="engine-bezel-edge" />
      <circle cx="500" cy="500" r="512" className="engine-bezel-edge" />
      <circle cx="500" cy="500" r="471" className="engine-bezel-dial" />
    </svg>
  );
}

/** A small dial (docks under 300px): the static Core with no defs, so it repeats freely. */
export function DialPoster({ id, children }: { readonly id: string; readonly children?: ReactNode }) {
  return (
    <div className="ep engine-face engine-face--mini" data-poster={id} aria-hidden="true">
      <span className="engine-glass" />
      <Bezel />
      <CoreRingMini />
      {children}
    </div>
  );
}
