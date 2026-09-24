import type { CSSProperties, ReactNode, SVGProps } from "react";

import { DRAW_POSTERS, drawingOf, type DrawPoster } from "@/lib/landing/engine/posters";
import type { PathKind, PosterPath } from "@/lib/landing/engine/drawing";

import CoreRing, { CoreGlow } from "../core/CoreRing";
import CoreRingMini from "../core/CoreRingMini";

/**
 * The engine's posters — what stands in for it with no WebGL (no JS, reduced
 * motion, the poster tier, print, and until the live engine's first frame).
 *
 * Technical drawings ship once, as <symbol>s in one hidden sprite, and are
 * placed with <use>: the stage shows each in two tones (clipped at the paper's
 * edge) and the static layout's slots show it again, for the cost of a
 * reference. Inside a symbol nothing relies on document selectors — lines are
 * `currentColor`, fills and hues are custom properties the <use> inherits.
 */

type Attrs = SVGProps<SVGPathElement>;

/** On the symbol itself (fill, stroke and its width inherit); outlines need nothing more. */
const SYMBOL = { fill: "none", stroke: "currentColor", strokeWidth: 1.4 } as const;
/** Not inherited, so on every path: line widths stay in screen pixels at any poster size. */
const BASE: Attrs = { vectorEffect: "non-scaling-stroke" };
const KIND: Record<PathKind, Attrs> = {
  body: { stroke: "none" },
  outline: {},
  hidden: { strokeWidth: 1, strokeDasharray: "4 3", opacity: 0.4 },
  centre: { strokeWidth: 1, strokeDasharray: "16 4 2 4", opacity: 0.5 },
  bore: { strokeWidth: 1, opacity: 0.65 },
  inlay: { strokeWidth: 2.4 },
  arc: { strokeWidth: 3.2, strokeLinecap: "round" },
  tooth: { strokeWidth: 0.8, opacity: 0.55 },
  shaft: { strokeWidth: 1 },
  dim: { strokeWidth: 0.8, opacity: 0.65 },
  port: { strokeWidth: 1.5 },
};
/** Modules other than a station's focus. */
const GHOST = 0.28;

function attrs(path: PosterPath, poster: DrawPoster): Attrs {
  const a: Attrs = { ...BASE, ...KIND[path.kind] };
  const style: CSSProperties = {};
  if (path.kind === "body" || path.kind === "port") style.fill = "var(--ep-body)";
  if (path.kind === "body") a.fillOpacity = 0.9;
  if (path.hue !== undefined) {
    if (poster.sketch) a.opacity = 0.6;
    else style.stroke = `var(--ep-h${path.hue})`;
    if (path.kind === "arc" && !poster.powered) a.opacity = 0.22;
  }
  if (poster.focus !== undefined && path.module >= 0 && path.module !== poster.focus) {
    a.opacity = (typeof a.opacity === "number" ? a.opacity : 1) * GHOST;
  }
  return Object.keys(style).length ? { ...a, style } : a;
}

/**
 * Consecutive paths that would be drawn alike become one path: painter's order
 * is kept (only neighbours merge) and the sprite stays small.
 */
function runs(poster: DrawPoster): { readonly d: string; readonly attrs: Attrs }[] {
  const out: { d: string; attrs: Attrs; key: string }[] = [];
  for (const path of drawingOf(poster).paths) {
    const a = attrs(path, poster);
    const key = JSON.stringify(a);
    const last = out[out.length - 1];
    if (last && last.key === key) last.d += path.d;
    else out.push({ d: path.d, attrs: a, key });
  }
  return out;
}

/** Every drawing, once. Rendered at the top of the landing (outside any hidden subtree). */
export function PosterSprite() {
  return (
    <svg className="engine-sprite" width="0" height="0" aria-hidden="true" focusable="false">
      {DRAW_POSTERS.map((poster) => (
        <symbol key={poster.id} id={`ep-${poster.id}`} viewBox={drawingOf(poster).viewBox.join(" ")} {...SYMBOL}>
          {runs(poster).map((run, i) => (
            <path key={i} d={run.d} {...run.attrs} />
          ))}
        </symbol>
      ))}
    </svg>
  );
}

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
      <use href={`#ep-${id}`} width="100%" height="100%" />
    </svg>
  );
}

/** The bezel around the Core (CORE's 1000 box is the face's radius 2.1; the bezel runs to 2.3). */
function Bezel() {
  return (
    <svg className="engine-bezel" viewBox="0 0 1000 1000" aria-hidden="true" focusable="false">
      <circle cx="500" cy="500" r="530" className="engine-bezel-knurl" />
      <circle cx="500" cy="500" r="547" className="engine-bezel-edge" />
      <circle cx="500" cy="500" r="512" className="engine-bezel-edge" />
      <circle cx="500" cy="500" r="471" className="engine-bezel-dial" />
    </svg>
  );
}

type FaceProps = {
  /** `data-poster` — which beat poster this is (face-ring, face-top, or a dock/slot's own). */
  readonly id: string;
  /** Unique per instance (CoreRing's <defs> ids). */
  readonly prefix: string;
  readonly className?: string;
  /** Layers inside the ring (demos, the document fan). */
  readonly children?: ReactNode;
};

/** A face pose: the Core itself, behind smoked glass, in its bezel. */
export function FacePoster({ id, prefix, className, children }: FaceProps) {
  return (
    <div className={`ep engine-face${className ? ` ${className}` : ""}`} data-poster={id} aria-hidden="true">
      <span className="engine-glass" />
      <Bezel />
      <CoreGlow />
      <CoreRing prefix={prefix} />
      {children}
    </div>
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
