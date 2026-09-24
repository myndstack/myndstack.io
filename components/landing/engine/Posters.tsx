import type { ReactNode } from "react";

import { DRAW_POSTERS } from "@/lib/landing/engine/posters";
import { SPRITE_URL } from "@/lib/landing/engine/sprite";

import CoreRing, { CoreGlow, CoreRingStill } from "../core/CoreRing";
import { Bezel } from "./Dial";

/**
 * The engine's posters — what stands in for it with no WebGL (no JS, reduced
 * motion, the poster tier, print, and until the live engine's first frame).
 *
 * Technical drawings live in one static sprite file (lib/landing/engine/
 * sprite.ts), placed with <use>: the stage shows each in two tones (clipped
 * at the paper's edge) and the static layout's slots show it again, for the
 * cost of a reference. The face poses are the Core itself.
 */

const SKETCH = new Set(DRAW_POSTERS.filter((p) => p.sketch).map((p) => p.id));

/** One drawing, fitted to its box. */
export function DrawingPoster({ id, className }: { readonly id: string; readonly className?: string }) {
  return (
    <svg
      className={`ep${className ? ` ${className}` : ""}`}
      data-poster={id}
      data-sketch={SKETCH.has(id) ? "" : undefined}
      aria-hidden="true"
      focusable="false"
    >
      <use href={`${SPRITE_URL}#ep-${id}`} width="100%" height="100%" />
    </svg>
  );
}

type FaceProps = {
  /** `data-poster` — which beat poster this is (the stage's "face", or a slot's own). */
  readonly id: string;
  /** Unique per instance (CoreRing's <defs> ids). */
  readonly prefix: string;
  readonly className?: string;
  /**
   * A still ring (the static layout's slots): one shared symbol, nothing to
   * animate. The stage's rings draw on and light arc by arc, so they're whole.
   */
  readonly still?: boolean;
  /** Layers inside the ring (demos, the document fan). */
  readonly children?: ReactNode;
};

/** A face pose: the Core itself, behind smoked glass, in its bezel. */
export function FacePoster({ id, prefix, className, still, children }: FaceProps) {
  return (
    <div className={`ep engine-face${className ? ` ${className}` : ""}`} data-poster={id} aria-hidden="true">
      <span className="engine-glass" />
      <Bezel />
      <CoreGlow />
      {still ? <CoreRingStill /> : <CoreRing prefix={prefix} />}
      {children}
    </div>
  );
}
