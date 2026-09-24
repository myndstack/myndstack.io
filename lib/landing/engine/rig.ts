/**
 * The engine's rig: where each module is for a pose, and what the camera
 * frames. Pure (no geometry is built, no DOM, no three.js), so the director
 * places the camera and the DOM overlays with exactly the numbers the
 * renderer draws with — one source, no drift.
 *
 * Each module's model matrix (module frame → world, column-major):
 *
 *   T(lift toward the camera) · R(tilt) · T(agency shift, axial position) · R(agency roll)
 *
 * The axial position is the explode (geometry/parts.ts moduleZ) plus, in the
 * agency state, a gap; `align` 1 → 0 blends the agency offsets in.
 */
import { CORE } from "@/lib/motion/core-geometry";

import { FACE_R, cameraBasis, type Vec3 } from "./camera";
import { GLYPH_Z } from "./geometry/index";
import { EXTENTS, moduleZ } from "./geometry/parts";
import { CH, type Pose } from "./types";

/** How far (world units) a fully lifted module travels toward the camera. */
export const LIFT = 1.4;
/** The chamber's radius (world): CORE's inner guide circle. */
export const R_BORE = (CORE.rInner / (CORE.size / 2)) * FACE_R;

/** The agency state per module (face first): off-axis shifts, extra gaps back along the axis, rolls (degrees). */
export const AGENCY = {
  shift: [0, 0.26, -0.22, 0.3, -0.16],
  gap: [0, 0.14, 0.34, 0.12, 0.4],
  roll: [0, 5, -4, 3, -5],
} as const;

export type Rig = {
  /** 5 × 16 floats: each module's frame → world, column-major. */
  readonly models: Float32Array;
  /** What a sphere fit frames: the whole engine, or (focus) the aimed module. */
  readonly sphere: { readonly c: Vec3; readonly r: number };
  /** World centre of the face's CORE circle. */
  readonly face: Vec3;
  /** The engine's axis in the world (the face's normal). */
  readonly axis: Vec3;
};

const DEG = Math.PI / 180;
const lerp = (x: number, y: number, u: number) => x + (y - x) * u;
const lerp3 = (x: Vec3, y: Vec3, u: number): Vec3 => [lerp(x[0], y[0], u), lerp(x[1], y[1], u), lerp(x[2], y[2], u)];

/** A point in module `k`'s frame → world. */
export function transform(models: Float32Array, k: number, p: Vec3): Vec3 {
  const m = k * 16;
  return [
    models[m] * p[0] + models[m + 4] * p[1] + models[m + 8] * p[2] + models[m + 12],
    models[m + 1] * p[0] + models[m + 5] * p[1] + models[m + 9] * p[2] + models[m + 13],
    models[m + 2] * p[0] + models[m + 6] * p[1] + models[m + 10] * p[2] + models[m + 14],
  ];
}

export function rig(pose: Pose, out: Float32Array = new Float32Array(80)): Rig {
  const t = pose[CH.tilt] * DEG;
  const ct = Math.cos(t);
  const st = Math.sin(t);
  const { back } = cameraBasis(pose[CH.yaw], pose[CH.pitch]);
  const agency = 1 - Math.min(1, Math.max(0, pose[CH.align]));
  const explode = pose[CH.explode];

  for (let k = 0; k < 5; k++) {
    const roll = AGENCY.roll[k] * agency * DEG;
    const cr = Math.cos(roll);
    const sr = Math.sin(roll);
    // Module frame: roll about local x, then the agency shift (local x) and the axial position (local z).
    const lx = AGENCY.shift[k] * agency;
    const lz = moduleZ(k, explode) - AGENCY.gap[k] * agency;
    // Columns of R_roll: x = (1,0,0), y = (0,cr,sr), z = (0,-sr,cr). Then R_tilt maps (x, y, z) → (x, y·ct + z·st, z·ct − y·st).
    const tilt = (x: number, y: number, z: number): Vec3 => [x, y * ct + z * st, z * ct - y * st];
    const cx = tilt(1, 0, 0);
    const cy = tilt(0, cr, sr);
    const cz = tilt(0, -sr, cr);
    const lift = pose[CH.lift + k] * LIFT;
    const pos = tilt(lx, 0, lz);
    const m = k * 16;
    out[m] = cx[0];
    out[m + 1] = cx[1];
    out[m + 2] = cx[2];
    out[m + 3] = 0;
    out[m + 4] = cy[0];
    out[m + 5] = cy[1];
    out[m + 6] = cy[2];
    out[m + 7] = 0;
    out[m + 8] = cz[0];
    out[m + 9] = cz[1];
    out[m + 10] = cz[2];
    out[m + 11] = 0;
    out[m + 12] = pos[0] + back[0] * lift;
    out[m + 13] = pos[1] + back[1] * lift;
    out[m + 14] = pos[2] + back[2] * lift;
    out[m + 15] = 1;
  }

  // The whole engine along its axis (lifts and agency offsets aside: they're small next to it).
  let zMin = Infinity;
  let zMax = -Infinity;
  let rMax = 0;
  for (let k = 0; k < 5; k++) {
    const z = moduleZ(k, explode);
    zMin = Math.min(zMin, z + EXTENTS[k].zMin);
    zMax = Math.max(zMax, z + EXTENTS[k].zMax);
    rMax = Math.max(rMax, EXTENTS[k].radius);
  }
  const zc = (zMin + zMax) / 2;
  const whole = { c: [0, zc * st, zc * ct] as Vec3, r: Math.hypot((zMax - zMin) / 2, rMax) };

  // The aimed module (between two when aim is fractional), wherever it has been pulled.
  const aim = Math.min(4, Math.max(0, pose[CH.aim]));
  const k0 = Math.floor(aim);
  const k1 = Math.min(4, k0 + 1);
  const f = aim - k0;
  const moduleSphere = (k: number) => {
    const e = EXTENTS[k];
    return { c: transform(out, k, [0, 0, (e.zMin + e.zMax) / 2]), r: Math.hypot((e.zMax - e.zMin) / 2, e.radius) };
  };
  const a = moduleSphere(k0);
  const b = moduleSphere(k1);
  const focus = Math.min(1, Math.max(0, pose[CH.focus]));
  const mod = { c: lerp3(a.c, b.c, f), r: lerp(a.r, b.r, f) };
  const sphere = { c: lerp3(whole.c, mod.c, focus), r: lerp(whole.r, mod.r, focus) };

  return { models: out, sphere, face: transform(out, 0, [0, 0, GLYPH_Z]), axis: [0, st, ct] };
}
