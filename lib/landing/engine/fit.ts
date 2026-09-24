/**
 * Camera fit: place the engine exactly inside a CSS box. Closed form, so the
 * engine lands on the same pixels every time for a given pose and box — which
 * is what lets DOM overlays (demos, labels, the document fan) line up with it
 * by construction, and the WebGL face match the SVG poster to half a pixel.
 *
 * The camera always looks straight at the engine; the box position comes from
 * a lens shift (three's `camera.setViewOffset`), which translates the image
 * without the skew a sideways-moved camera would add.
 */
import type { Box, FitKind } from "./types";

const DEG = Math.PI / 180;

/** Focal length in px for a vertical field of view and a canvas height. */
export function focalPx(fovDeg: number, heightPx: number): number {
  return heightPx / 2 / Math.tan((fovDeg * DEG) / 2);
}

/** Face-on: a circle of world radius `radius`, centred on the view axis, spans `radiusPx`. */
export function circleDistance(radius: number, radiusPx: number, fovDeg: number, heightPx: number): number {
  return (focalPx(fovDeg, heightPx) * radius) / radiusPx;
}

/** Any pose: a sphere of world radius `radius` silhouettes at `radiusPx` (tangent-line projection). */
export function sphereDistance(radius: number, radiusPx: number, fovDeg: number, heightPx: number): number {
  const f = focalPx(fovDeg, heightPx);
  return radius * Math.sqrt(1 + (f / radiusPx) ** 2);
}

/** The circle the engine should occupy: `fill` of the box's limiting side, offset by fractions of the box. */
export function targetCircle(box: Box, fill: number, offX: number, offY: number): { cx: number; cy: number; r: number } {
  return {
    cx: box.x + box.w / 2 + offX * box.w,
    cy: box.y + box.h / 2 + offY * box.h,
    r: (fill * Math.min(box.w, box.h)) / 2,
  };
}

export type CameraFit = {
  readonly distance: number;
  /** `setViewOffset(canvas.w, canvas.h, shiftX, shiftY, canvas.w, canvas.h)`. */
  readonly shiftX: number;
  readonly shiftY: number;
  /** Where the engine lands, in canvas px. */
  readonly cx: number;
  readonly cy: number;
  readonly rPx: number;
};

export type FitInput = {
  readonly canvas: { readonly w: number; readonly h: number };
  readonly box: Box;
  readonly kind: FitKind;
  /** World radius: the face's CORE box (circle) or the posed bounding sphere. */
  readonly radius: number;
  readonly fovDeg: number;
  readonly fill: number;
  readonly offX: number;
  readonly offY: number;
};

/** null when the canvas or box is empty (the engine hides; nothing is NaN). */
export function fitCamera(i: FitInput): CameraFit | null {
  if (!(i.canvas.w > 0 && i.canvas.h > 0 && i.box.w > 0 && i.box.h > 0 && i.radius > 0 && i.fill > 0)) return null;
  const { cx, cy, r } = targetCircle(i.box, i.fill, i.offX, i.offY);
  const distance =
    i.kind === "circle" ? circleDistance(i.radius, r, i.fovDeg, i.canvas.h) : sphereDistance(i.radius, r, i.fovDeg, i.canvas.h);
  return { distance, shiftX: i.canvas.w / 2 - cx, shiftY: i.canvas.h / 2 - cy, cx, cy, rPx: r };
}
