/**
 * The engine's choreography: one pose per beat, and the scroll → pose mapping
 * between them. Pure data + pure maths (no DOM, no three.js), unit-tested.
 *
 * - Every beat has a marker: an in-flow element (never sticky — a stuck
 *   element's offsetTop lies). A beat's HOLD is centred where its marker
 *   meets the reading line; the engine is perfectly still for the hold, so
 *   copy is read against a still object.
 * - Between holds the engine TRAVELS: each channel group eases across the
 *   whole gap (flat at both holds, so there's no stop-and-go), optionally
 *   through pass-through waypoints (hold 0) on a monotone spline.
 * - Only the page scroll is smoothed (by the director); poses are sampled from
 *   it, so the object always stays on its authored path.
 *
 * The beat table lives in beats.ts, the page it implies in scenes.ts; the
 * tests check the table — speed limits, continuity, holds.
 */
import { BEATS } from "./beats";
import { bezier, linear, monotoneHermite } from "./ease";
import { type Grid } from "./layout";
import { basePose, buildPoses, lastStartAtOrBefore, place, type Markers, type Placed } from "./timeline";
import { CH, POSE_LEN, type Beat, type Bezier, type ChannelGroup, type Pose } from "./types";

export { ARC_MID, BEATS, LOCK } from "./beats";
export { READING, beatAt, buildPoses, place, type MarkerBox, type Markers, type Placed } from "./timeline";

/** The travel ease: flat at both ends (zero velocity at holds). */
export const TRAVEL: Bezier = [0.55, 0, 0.25, 1];

// ---- Channel groups -------------------------------------------------------

const ORBIT: readonly number[] = [
  CH.yaw,
  CH.pitch,
  CH.tilt,
  CH.fov,
  CH.fill,
  CH.offX,
  CH.offY,
  CH.aim,
  CH.focus,
  CH.circle,
  CH.cx,
  CH.cy,
  CH.cr,
];
const ASSEMBLY: readonly number[] = [
  CH.explode,
  CH.lift,
  CH.lift + 1,
  CH.lift + 2,
  CH.lift + 3,
  CH.lift + 4,
  CH.cutaway,
  CH.build,
  CH.align,
];
const GROUP_OF: readonly ChannelGroup[] = Array.from({ length: POSE_LEN }, (_, c) => {
  if (ORBIT.includes(c)) return "orbit";
  if (ASSEMBLY.includes(c)) return "assembly";
  if (c >= CH.arc && c < CH.arc + 5) return "arcs";
  if (c === CH.playhead || c === CH.dial) return "playhead";
  if (c === CH.portal) return "iris";
  return "look";
});

/** [delay, lead] as fractions of a travel. Explode starts 15% late and lands 10% early. */
const DEFAULT_STAGGER: Record<ChannelGroup, readonly [number, number]> = {
  orbit: [0, 0],
  assembly: [0.15, 0.1],
  look: [0, 0],
  arcs: [0, 0],
  // The playhead and the dial's detents swing in the middle 40% (the demo leaves before, the next builds after).
  playhead: [0.3, 0.3],
  // The iris opens once the ring has turned to face the camera.
  iris: [0.55, 0],
};
const DEFAULT_EASE: Record<ChannelGroup, Bezier> = {
  orbit: TRAVEL,
  assembly: TRAVEL,
  look: TRAVEL,
  arcs: [0, 0, 1, 1],
  playhead: TRAVEL,
  iris: TRAVEL,
};
/** Arcs ramp linearly over 18% of a travel (≈12svh of 68), 4.5% (≈3svh) apart, clockwise. */
const ARC_START = 0.3;
const ARC_STEP = 0.045;
const ARC_RAMP = 0.18;

// ---- Resolving against the page ---------------------------------------------

export type Resolved = Placed & {
  /** Ease per beat per group, for the travel into that beat. */
  readonly eases: readonly Record<ChannelGroup, (t: number) => number>[];
};

const easeCache = new Map<string, (t: number) => number>();
function easeFor(b: Bezier): (t: number) => number {
  const key = b.join(",");
  let fn = easeCache.get(key);
  if (!fn) {
    fn = b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 1 ? linear : bezier(b);
    easeCache.set(key, fn);
  }
  return fn;
}

/** The eases for a placed timeline's travels (the live half samples with them). */
export function withEases(placed: Placed): Resolved {
  const eases = placed.beats.map((b) => {
    const e = {} as Record<ChannelGroup, (t: number) => number>;
    for (const g of Object.keys(DEFAULT_EASE) as ChannelGroup[]) e[g] = easeFor(b.ease?.[g] ?? DEFAULT_EASE[g]);
    return e;
  });
  return { ...placed, eases };
}

/** Place the beats on the page (timeline.ts) with the eases to travel between them. */
export function resolve(beats: readonly Beat[], markers: Markers, vh: number, maxScroll: number, g?: Grid): Resolved {
  return withEases(place(beats, markers, vh, maxScroll, g));
}

// ---- Sampling ---------------------------------------------------------------

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

function window01(t: number, delay: number, lead: number): number {
  const span = 1 - delay - lead;
  if (span <= 0) return t >= delay ? 1 : 0;
  return clamp01((t - delay) / span);
}

const xsScratch: number[] = [];
const vsScratch: number[] = [];
const viaScratch: number[] = [];

/**
 * The pose at scroll `y` (already smoothed by the caller), written into `out`
 * without allocating. Exact inside holds; eased per group across travels;
 * idle motion and pointer lean are zero while travelling; annotations dip out
 * at a travel's start and back in at its end.
 */
export function samplePose(res: Resolved, y: number, out: Pose): void {
  const n = res.beats.length;
  if (n === 0) {
    basePose(out);
    return;
  }
  const i = lastStartAtOrBefore(res, y);
  if (i < 0) {
    out.set(res.poses.subarray(0, POSE_LEN));
    return;
  }
  if (y <= res.ends[i] || i === n - 1) {
    out.set(res.poses.subarray(i * POSE_LEN, (i + 1) * POSE_LEN));
    return;
  }
  // Travel: from the hold at or before y to the next hold, through any waypoints.
  let left = i;
  while (left > 0 && res.via[left]) left--;
  let right = i + 1;
  while (right < n - 1 && res.via[right]) right++;
  const y0 = res.ends[left];
  const y1 = res.starts[right];
  const span = y1 - y0;
  const t = span > 0 ? clamp01((y - y0) / span) : 1;
  const beat = res.beats[right];
  const eases = res.eases[right];
  const lp = left * POSE_LEN;
  const rp = right * POSE_LEN;
  // Waypoints strictly inside the travel (one sitting on a hold's edge would
  // make a zero-length knot interval).
  viaScratch.length = 0;
  for (let k = left + 1; k < right; k++) {
    const x = span > 0 ? (res.starts[k] - y0) / span : 0;
    const prevX = viaScratch.length ? xsScratch[viaScratch.length] : 0;
    if (x > prevX + 1e-6 && x < 1 - 1e-6) {
      viaScratch.push(k);
      xsScratch[viaScratch.length] = x;
    }
  }
  const hasVias = viaScratch.length > 0;
  if (hasVias) {
    xsScratch.length = viaScratch.length + 2;
    xsScratch[0] = 0;
    xsScratch[viaScratch.length + 1] = 1;
  }
  for (let c = 0; c < POSE_LEN; c++) {
    const g = GROUP_OF[c];
    let local: number;
    if (g === "arcs") {
      const k = c - CH.arc;
      local = window01(t, ARC_START + ARC_STEP * k, 1 - (ARC_START + ARC_STEP * k + ARC_RAMP));
    } else {
      const [delay, lead] = beat.stagger?.[g] ?? DEFAULT_STAGGER[g];
      local = window01(t, delay, lead);
    }
    const a = res.poses[lp + c];
    const b = res.poses[rp + c];
    if (hasVias) {
      vsScratch.length = 0;
      vsScratch.push(a);
      for (const k of viaScratch) vsScratch.push(res.poses[k * POSE_LEN + c]);
      vsScratch.push(b);
      out[c] = monotoneHermite(xsScratch, vsScratch, local);
    } else {
      out[c] = a + (b - a) * eases[g](local);
    }
  }
  out[CH.ambient] = 0;
  out[CH.lean] = 0;
  // Annotations dip: out over 6svh at the start, back in over 10svh at the end
  // (capped to the first and second half of a short travel).
  const svh = span > 0 ? (span / res.vh) * 100 : 1;
  const outFrac = Math.min(0.4, ANNOT_OUT / svh);
  const inFrac = Math.min(0.5, ANNOT_IN / svh);
  const annotA = res.poses[lp + CH.annot];
  const annotB = res.poses[rp + CH.annot];
  out[CH.annot] = t < 0.5 ? annotA * (1 - window01(t, 0, 1 - outFrac)) : annotB * window01(t, 1 - inFrac, 0);
}

/** Annotation fade-out / fade-in lengths, svh. */
const ANNOT_OUT = 6;
const ANNOT_IN = 10;

/** Linear blend (phones tween between poses; `u` is already eased). */
export function blendPose(a: Pose, b: Pose, u: number, out: Pose): void {
  for (let c = 0; c < POSE_LEN; c++) out[c] = a[c] + (b[c] - a[c]) * u;
}

/** Every beat's pose by id (phones pick poses by section, not by scroll). */
export function posesById(beats: readonly Beat[] = BEATS): ReadonlyMap<string, Pose> {
  const all = buildPoses(beats);
  return new Map(beats.map((b, i) => [b.id, all.slice(i * POSE_LEN, (i + 1) * POSE_LEN)]));
}

const DEG = Math.PI / 180;

/**
 * The engine's axis in the camera's frame (x right, y up, z toward the
 * camera). The renderer builds the same rotation; tests use it to bound how
 * fast the object appears to turn.
 */
export function axisInCamera(pose: Pose): readonly [number, number, number] {
  const tilt = pose[CH.tilt] * DEG;
  const yaw = pose[CH.yaw] * DEG;
  const pitch = pose[CH.pitch] * DEG;
  // World axis: tilted from +z (toward the default camera) up to +y.
  const ax = 0;
  const ay = Math.sin(tilt);
  const az = Math.cos(tilt);
  // Camera basis for a camera orbiting at (yaw, pitch), looking at the origin.
  const back = [Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), Math.cos(pitch) * Math.cos(yaw)];
  const right = [Math.cos(yaw), 0, -Math.sin(yaw)];
  const up = [
    back[1] * right[2] - back[2] * right[1],
    back[2] * right[0] - back[0] * right[2],
    back[0] * right[1] - back[1] * right[0],
  ];
  return [
    ax * right[0] + ay * right[1] + az * right[2],
    ax * up[0] + ay * up[1] + az * up[2],
    ax * back[0] + ay * back[1] + az * back[2],
  ];
}
