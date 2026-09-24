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
 * The beat table and SCROLL_PLAN (the designed page) live in beats.ts; the
 * tests check the table against the plan — speed limits, continuity, holds.
 */
import { BASE, BEATS } from "./beats";
import { bezier, linear, monotoneHermite } from "./ease";
import {
  CH,
  POSE_LEN,
  type Beat,
  type Bezier,
  type ChannelGroup,
  type HostId,
  type Pose,
  type PoseSpec,
} from "./types";

export { ARC_MID, BEATS, LOCK, SCROLL_PLAN, type PlanBlock } from "./beats";

/** Where held copy sits: a viewport fraction from the top. */
export const READING = 0.46;
/** The travel ease: flat at both ends (zero velocity at holds). */
export const TRAVEL: Bezier = [0.55, 0, 0.25, 1];
// ---- Channel groups -------------------------------------------------------

const ORBIT: readonly number[] = [CH.yaw, CH.pitch, CH.tilt, CH.fov, CH.fill, CH.offX, CH.offY, CH.aim, CH.focus];
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
  if (c === CH.playhead) return "playhead";
  return "look";
});

/** [delay, lead] as fractions of a travel. Explode starts 15% late and lands 10% early. */
const DEFAULT_STAGGER: Record<ChannelGroup, readonly [number, number]> = {
  orbit: [0, 0],
  assembly: [0.15, 0.1],
  look: [0, 0],
  arcs: [0, 0],
  // The playhead swings in the middle 40% (the demo leaves before, the next builds after).
  playhead: [0.3, 0.3],
};
const DEFAULT_EASE: Record<ChannelGroup, Bezier> = {
  orbit: TRAVEL,
  assembly: TRAVEL,
  look: TRAVEL,
  arcs: [0, 0, 1, 1],
  playhead: TRAVEL,
};
/** Arcs ramp linearly over 18% of a travel (≈12svh of 68), 4.5% (≈3svh) apart, clockwise. */
const ARC_START = 0.3;
const ARC_STEP = 0.045;
const ARC_RAMP = 0.18;

// ---- Building poses ---------------------------------------------------------

function write(spec: PoseSpec, out: Pose, offset: number): void {
  for (const [name, c] of Object.entries(CH) as [keyof typeof CH, number][]) {
    if (name === "lift") {
      spec.lift?.forEach((v, k) => (out[offset + c + k] = v));
    } else if (name === "arc") {
      spec.arcs?.forEach((v, k) => (out[offset + c + k] = v));
    } else {
      const v = (spec as Record<string, number | undefined>)[name];
      if (v !== undefined) out[offset + c] = v;
    }
  }
}

/**
 * Every beat's full pose (n × POSE_LEN), each carrying over whatever its spec
 * doesn't list from the beat above — computed over the whole table, so a
 * beat dropped later (a missing section) never changes the poses after it.
 */
export function buildPoses(beats: readonly Beat[]): Float32Array {
  const poses = new Float32Array(beats.length * POSE_LEN);
  const current = new Float32Array(POSE_LEN);
  write(BASE, current, 0);
  beats.forEach((beat, i) => {
    write(beat.pose, current, 0);
    poses.set(current, i * POSE_LEN);
  });
  return poses;
}

// ---- Resolving against the page ---------------------------------------------

export type MarkerBox = { readonly top: number; readonly height: number };
export type Markers = ReadonlyMap<string, MarkerBox>;

export type Resolved = {
  /** Viewport height the timeline was resolved at (px). */
  readonly vh: number;
  readonly beats: readonly Beat[];
  /** Hold [start, end] per beat, in scroll px (start === end for a waypoint). */
  readonly starts: Float64Array;
  readonly ends: Float64Array;
  readonly poses: Float32Array;
  /** Waypoints (hold 0) between holds: the curve passes through them without stopping. */
  readonly via: Uint8Array;
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

/**
 * Place one host's beats on the page. Each host (the stage, each dock) has its
 * own timeline — two docks can be on screen at once, and only the one holding
 * the canvas is sampled — but poses carry over across the whole table.
 *
 * `markers` are document-px boxes measured outside the frame; beats whose
 * marker is missing (a section that didn't render) are dropped. Holds are
 * clamped to [0, maxScroll] and never overlap (on a short page, neighbours
 * shrink to meet).
 */
export function resolve(
  beats: readonly Beat[],
  markers: Markers,
  vh: number,
  maxScroll: number,
  host: HostId = "stage",
): Resolved {
  const allPoses = buildPoses(beats);
  const kept: Beat[] = [];
  const keptPoses: number[] = [];
  const starts: number[] = [];
  const ends: number[] = [];
  beats.forEach((beat, i) => {
    if (beat.host !== host) return;
    const m = markers.get(beat.marker);
    if (!m) return;
    const ref = beat.ref ?? "center";
    const point = ref === "top" ? m.top : ref === "bottom" ? m.top + m.height : m.top + m.height / 2;
    const centre = point - (beat.anchor ?? READING) * vh;
    const half = (beat.hold * vh) / 200;
    let start = Math.max(0, centre - half);
    let end = Math.max(start, centre + half);
    start = Math.min(start, maxScroll);
    end = Math.min(end, maxScroll);
    kept.push(beat);
    keptPoses.push(i);
    starts.push(start);
    ends.push(end);
  });
  // Never overlap: a hold that runs into the next one shrinks with it to meet in the middle.
  for (let i = 1; i < kept.length; i++) {
    if (starts[i] < ends[i - 1]) {
      const meet = Math.max(starts[i - 1], Math.min(ends[i], (ends[i - 1] + starts[i]) / 2));
      ends[i - 1] = meet;
      starts[i] = Math.max(starts[i], meet);
      if (ends[i] < starts[i]) ends[i] = starts[i];
    }
  }
  const poses = new Float32Array(kept.length * POSE_LEN);
  keptPoses.forEach((src, i) => poses.set(allPoses.subarray(src * POSE_LEN, (src + 1) * POSE_LEN), i * POSE_LEN));
  const via = new Uint8Array(kept.length);
  kept.forEach((b, i) => (via[i] = b.hold === 0 && i > 0 && i < kept.length - 1 ? 1 : 0));
  const eases = kept.map((b) => {
    const e = {} as Record<ChannelGroup, (t: number) => number>;
    for (const g of Object.keys(DEFAULT_EASE) as ChannelGroup[]) e[g] = easeFor(b.ease?.[g] ?? DEFAULT_EASE[g]);
    return e;
  });
  return {
    vh,
    beats: kept,
    starts: Float64Array.from(starts),
    ends: Float64Array.from(ends),
    poses,
    via,
    eases,
  };
}

// ---- Sampling ---------------------------------------------------------------

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

function window01(t: number, delay: number, lead: number): number {
  const span = 1 - delay - lead;
  if (span <= 0) return t >= delay ? 1 : 0;
  return clamp01((t - delay) / span);
}

/** Index of the last beat whose hold starts at or before y (or -1). */
function lastStartAtOrBefore(res: Resolved, y: number): number {
  let lo = 0;
  let hi = res.beats.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (res.starts[mid] <= y) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
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
    out.fill(0);
    write(BASE, out, 0);
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

/**
 * The beat whose DOM state applies at `y`: the hold that contains it, or —
 * mid-travel — the nearer side, switching at the middle with ±5% hysteresis
 * so a wobble never flips attributes back and forth. Waypoints never count.
 */
export function beatAt(res: Resolved, y: number, prev: number | null): number {
  const n = res.beats.length;
  if (n === 0) return -1;
  let i = lastStartAtOrBefore(res, y);
  if (i < 0) return 0;
  while (i > 0 && res.via[i]) i--;
  if (y <= res.ends[i] || i === n - 1) return i;
  let j = i + 1;
  while (j < n - 1 && res.via[j]) j++;
  const span = res.starts[j] - res.ends[i];
  const t = span > 0 ? (y - res.ends[i]) / span : 1;
  if (prev === i && t < 0.55) return i;
  if (prev === j && t > 0.45) return j;
  return t < 0.5 ? i : j;
}

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
