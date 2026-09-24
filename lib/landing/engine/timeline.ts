/**
 * The beats placed on the page: where each hold sits in scroll px, and every
 * beat's full pose with its target circle baked in. This is all the first-load
 * director needs (which beat holds the stage, where the engine's circle is);
 * the travel maths between poses — eases, splines, sampling — lives in
 * choreography.ts and loads with the live renderer.
 */
import { BASE } from "./beats";
import { targetCircle } from "./fit";
import { boxOf, type Grid } from "./layout";
import { CH, POSE_LEN, type Beat, type Pose, type PoseSpec } from "./types";

/** Where held copy sits: a viewport fraction from the top. */
export const READING = 0.46;

export type MarkerBox = { readonly top: number; readonly height: number };
export type Markers = ReadonlyMap<string, MarkerBox>;

export type Placed = {
  /** Viewport height the timeline was placed at (px). */
  readonly vh: number;
  readonly beats: readonly Beat[];
  /** Hold [start, end] per beat, in scroll px (start === end for a waypoint). */
  readonly starts: Float64Array;
  readonly ends: Float64Array;
  readonly poses: Float32Array;
  /** Waypoints (hold 0) between holds: the curve passes through them without stopping. */
  readonly via: Uint8Array;
};

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

/** The resting pose every beat builds on. */
export function basePose(out: Pose): void {
  out.fill(0);
  write(BASE, out, 0);
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
    // Derived, never carried over: the fit blend is the beat's own fit.
    current[CH.circle] = beat.fit === "circle" ? 1 : 0;
    poses.set(current, i * POSE_LEN);
  });
  return poses;
}

/**
 * Place the beats on the page. `markers` are document-px boxes measured
 * outside the frame, keyed by beat id (scenes.ts puts each one where its
 * hold's centre meets the reading line); beats whose marker is missing (a
 * section that didn't render) are dropped. Holds are clamped to
 * [0, maxScroll] and never overlap (on a short page, neighbours shrink to
 * meet). With a grid, each beat's target circle is baked into its pose
 * (cx, cy, cr: canvas px), so the camera travels between placements instead
 * of jumping from box to box.
 */
export function place(beats: readonly Beat[], markers: Markers, vh: number, maxScroll: number, g?: Grid): Placed {
  const allPoses = buildPoses(beats);
  const kept: Beat[] = [];
  const keptPoses: number[] = [];
  const starts: number[] = [];
  const ends: number[] = [];
  beats.forEach((beat, i) => {
    const m = markers.get(beat.id);
    if (!m) return;
    const centre = m.top + m.height / 2 - READING * vh;
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
  if (g) {
    kept.forEach((beat, i) => {
      const o = i * POSE_LEN;
      const c = targetCircle(boxOf(g, beat.box), poses[o + CH.fill], poses[o + CH.offX], poses[o + CH.offY]);
      poses[o + CH.cx] = c.cx;
      poses[o + CH.cy] = c.cy;
      poses[o + CH.cr] = c.r;
    });
  }
  const via = new Uint8Array(kept.length);
  kept.forEach((b, i) => (via[i] = b.hold === 0 && i > 0 && i < kept.length - 1 ? 1 : 0));
  return { vh, beats: kept, starts: Float64Array.from(starts), ends: Float64Array.from(ends), poses, via };
}

/** Index of the last beat whose hold starts at or before y (or -1). */
export function lastStartAtOrBefore(res: Placed, y: number): number {
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

/**
 * The beat whose DOM state applies at `y`: the hold that contains it, or —
 * mid-travel — the nearer side, switching at the middle with ±5% hysteresis
 * so a wobble never flips attributes back and forth. Waypoints never count.
 */
export function beatAt(res: Placed, y: number, prev: number | null): number {
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
