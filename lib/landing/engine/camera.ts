/**
 * The engine's camera — the one projection the WebGL renderer and every DOM
 * overlay (bore demos, labels, readouts, the develop's origin) share, so they
 * land on the same pixels by construction.
 *
 * The camera orbits the look-at point at (yaw, pitch) and always looks
 * straight at it; where it lands on screen comes from a lens shift (an
 * off-axis projection: a pure image translation, so circles stay circles).
 * Distance comes from one of two closed-form fits, blended by `circle`:
 * the posed bounding sphere's silhouette, or the face's CORE circle (radius
 * FACE_R), each landing exactly on the target circle. fit.ts holds the same
 * formulas; the tests keep them equal.
 *
 * Matrices are column-major (WebGL / three's `fromArray`). Pure: no DOM.
 */
import type { Box } from "./types";

export type Vec3 = readonly [number, number, number];

/** The face's CORE box radius in world units (CORE's 500). */
export const FACE_R = 2.1;
/** Depth range around the look-at point: the whole engine, exploded and lifted, fits inside. */
const DEPTH_SPAN = 8;
const DEG = Math.PI / 180;

export type CameraSpec = {
  readonly yaw: number;
  readonly pitch: number;
  /** Vertical field of view, degrees. */
  readonly fov: number;
  /** Fit blend: 0 frames `sphere`'s silhouette, 1 the face's CORE circle. */
  readonly circle: number;
  readonly sphere: { readonly c: Vec3; readonly r: number };
  /** World centre of the face's CORE circle. */
  readonly face: Vec3;
  /** Where the engine lands, canvas px. */
  readonly target: { readonly cx: number; readonly cy: number; readonly r: number };
  readonly canvas: { readonly w: number; readonly h: number };
};

export type Camera = {
  readonly view: Float32Array;
  readonly proj: Float32Array;
  readonly eye: Vec3;
  readonly right: Vec3;
  readonly up: Vec3;
  readonly back: Vec3;
  /** Focal length, canvas px. */
  readonly focal: number;
  readonly distance: number;
  readonly near: number;
  readonly far: number;
  readonly target: CameraSpec["target"];
  readonly canvas: CameraSpec["canvas"];
};

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const finite = (...n: readonly number[]) => n.every(Number.isFinite);

/** The engine's frame → world: its axis (+z) tilted from the camera's default direction up toward +y. */
export function engineToWorld(tiltDeg: number, p: Vec3): Vec3 {
  const c = Math.cos(tiltDeg * DEG);
  const s = Math.sin(tiltDeg * DEG);
  return [p[0], p[1] * c + p[2] * s, p[2] * c - p[1] * s];
}

/** Right, up and back (look-at point → eye) for a camera orbiting at (yaw, pitch). */
export function cameraBasis(yawDeg: number, pitchDeg: number): { readonly right: Vec3; readonly up: Vec3; readonly back: Vec3 } {
  const y = yawDeg * DEG;
  const p = pitchDeg * DEG;
  const back: Vec3 = [Math.cos(p) * Math.sin(y), Math.sin(p), Math.cos(p) * Math.cos(y)];
  const right: Vec3 = [Math.cos(y), 0, -Math.sin(y)];
  return { right, up: cross(back, right), back };
}

export function buildCamera(s: CameraSpec): Camera | null {
  const { w, h } = s.canvas;
  const { cx, cy, r } = s.target;
  if (!finite(w, h, cx, cy, r, s.fov, s.yaw, s.pitch, s.circle, ...s.face, ...s.sphere.c)) return null;
  if (!(w > 0 && h > 0 && r > 0 && s.fov > 0 && s.fov < 170)) return null;
  const circle = Math.min(1, Math.max(0, s.circle));
  if (circle < 1 && !(s.sphere.r > 0)) return null;

  const focal = h / 2 / Math.tan((s.fov * DEG) / 2);
  const sphereD = circle < 1 ? s.sphere.r * Math.sqrt(1 + (focal / r) ** 2) : 0;
  const circleD = (focal * FACE_R) / r;
  const distance = sphereD + (circleD - sphereD) * circle;
  const look = lerp3(s.sphere.c, s.face, circle);
  const { right, up, back } = cameraBasis(s.yaw, s.pitch);
  const eye: Vec3 = [look[0] + back[0] * distance, look[1] + back[1] * distance, look[2] + back[2] * distance];

  const view = new Float32Array([
    right[0], up[0], back[0], 0,
    right[1], up[1], back[1], 0,
    right[2], up[2], back[2], 0,
    -dot(right, eye), -dot(up, eye), -dot(back, eye), 1,
  ]);
  const near = Math.max(0.05, distance - DEPTH_SPAN);
  const far = distance + DEPTH_SPAN;
  const f = 1 / Math.tan((s.fov * DEG) / 2);
  // Lens shift: the look-at point lands on (cx, cy) instead of the canvas centre.
  const dx = (2 * cx) / w - 1;
  const dy = 1 - (2 * cy) / h;
  const proj = new Float32Array([
    f / (w / h), 0, 0, 0,
    0, f, 0, 0,
    -dx, -dy, -(far + near) / (far - near), -1,
    0, 0, (-2 * far * near) / (far - near), 0,
  ]);
  return { view, proj, eye, right, up, back, focal, distance, near, far, target: s.target, canvas: s.canvas };
}

/** A world point on the canvas (CSS px, y down), with its depth in front of the camera; null behind it. */
export function project(cam: Camera, p: Vec3): { readonly x: number; readonly y: number; readonly depth: number } | null {
  const rel: Vec3 = [p[0] - cam.eye[0], p[1] - cam.eye[1], p[2] - cam.eye[2]];
  const depth = -dot(cam.back, rel);
  if (!(depth > cam.near * 0.5)) return null;
  return {
    x: cam.target.cx + (cam.focal * dot(cam.right, rel)) / depth,
    y: cam.target.cy - (cam.focal * dot(cam.up, rel)) / depth,
    depth,
  };
}

export type Ellipse = { readonly cx: number; readonly cy: number; readonly rx: number; readonly ry: number; readonly angle: number };

/**
 * A world circle (centre, normal, radius) on the canvas, as an ellipse: exact
 * face-on (a circle parallel to the image plane projects to a circle), and
 * within a fraction of a pixel for the slight turns the overlays ride through.
 */
export function projectCircle(cam: Camera, c: Vec3, normal: Vec3, radius: number): Ellipse | null {
  const n = Math.hypot(...normal) || 1;
  const nn: Vec3 = [normal[0] / n, normal[1] / n, normal[2] / n];
  // Any two unit vectors spanning the circle's plane.
  const seed: Vec3 = Math.abs(nn[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u0 = cross(nn, seed);
  const ul = Math.hypot(...u0);
  const u: Vec3 = [u0[0] / ul, u0[1] / ul, u0[2] / ul];
  const v = cross(nn, u);
  const N = 48;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const k = radius * Math.cos(a);
    const m = radius * Math.sin(a);
    const s = project(cam, [c[0] + u[0] * k + v[0] * m, c[1] + u[1] * k + v[1] * m, c[2] + u[2] * k + v[2] * m]);
    if (!s) return null;
    xs.push(s.x);
    ys.push(s.y);
  }
  const mx = xs.reduce((a, b) => a + b, 0) / N;
  const my = ys.reduce((a, b) => a + b, 0) / N;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (let i = 0; i < N; i++) {
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
    sxy += (xs[i] - mx) * (ys[i] - my);
  }
  sxx /= N;
  syy /= N;
  sxy /= N;
  // Principal axes of the covariance: a uniformly sampled ellipse has variance a²/2 along each.
  const tr = (sxx + syy) / 2;
  const det = Math.sqrt(Math.max(0, ((sxx - syy) / 2) ** 2 + sxy ** 2));
  return {
    cx: mx,
    cy: my,
    rx: Math.sqrt(2 * (tr + det)),
    ry: Math.sqrt(2 * Math.max(0, tr - det)),
    angle: (0.5 * Math.atan2(2 * sxy, sxx - syy) * 180) / Math.PI,
  };
}

/** Screen bounds (canvas px) of the points in front of the camera; null if none are. */
export function hull(cam: Camera, points: readonly Vec3[]): Box | null {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of points) {
    const s = project(cam, p);
    if (!s) continue;
    x0 = Math.min(x0, s.x);
    y0 = Math.min(y0, s.y);
    x1 = Math.max(x1, s.x);
    y1 = Math.max(y1, s.y);
  }
  return x1 >= x0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
}
