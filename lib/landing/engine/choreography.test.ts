import { describe, expect, it } from "vitest";

import {
  BEATS,
  READING,
  SCROLL_PLAN,
  axisInCamera,
  beatAt,
  blendPose,
  buildPoses,
  resolve,
  samplePose,
  type MarkerBox,
  type Markers,
} from "./choreography";
import { CH, POSE_LEN, type Beat, type HostId } from "./types";

const VH = 900;

/** The designed page (SCROLL_PLAN) laid out at a viewport height: marker boxes in document px. */
function layout(vh = VH, skip: readonly string[] = []) {
  const markers = new Map<string, MarkerBox>();
  let top = 0;
  for (const block of SCROLL_PLAN) {
    if (skip.includes(block.block)) continue;
    for (const m of block.markers) {
      const size = (m.size ?? 20) * (vh / 100);
      markers.set(m.id, { top: top + (m.at * vh) / 100 - size / 2, height: size });
    }
    top += (block.svh * vh) / 100;
  }
  return { markers, end: top - vh };
}

const channelNames = Object.entries(CH) as [string, number][];
const width = (c: number) => (c === CH.lift || c === CH.arc ? 5 : 1);

describe("the beat table", () => {
  it("has unique ids and a marker in the scroll plan for every beat", () => {
    const ids = new Set(BEATS.map((b) => b.id));
    expect(ids.size).toBe(BEATS.length);
    const planned = new Set(SCROLL_PLAN.flatMap((b) => b.markers.map((m) => m.id)));
    for (const beat of BEATS) expect(planned.has(beat.marker), beat.marker).toBe(true);
  });

  it("walks the capabilities in order and completes at the finale", () => {
    const caps = BEATS.filter((b) => b.dom?.cap !== undefined).map((b) => b.dom!.cap);
    expect(caps).toEqual([0, 1, 2, 3]);
    expect(BEATS.find((b) => b.id === "finale")?.dom?.complete).toBe(true);
  });

  it("builds finite poses with in-range emphasis channels", () => {
    const poses = buildPoses(BEATS);
    expect(poses.length).toBe(BEATS.length * POSE_LEN);
    for (let i = 0; i < BEATS.length; i++) {
      const p = poses.subarray(i * POSE_LEN, (i + 1) * POSE_LEN);
      for (const v of p) expect(Number.isFinite(v)).toBe(true);
      for (let k = 0; k < 5; k++) {
        expect(p[CH.arc + k]).toBeGreaterThanOrEqual(0);
        expect(p[CH.arc + k]).toBeLessThanOrEqual(1);
      }
      expect(p[CH.fill]).toBeGreaterThan(0);
      expect(p[CH.fill]).toBeLessThanOrEqual(1);
    }
  });

  it("carries unlisted channels over from the beat above", () => {
    const poses = buildPoses(BEATS);
    const at = (id: string) => BEATS.findIndex((b) => b.id === id);
    const dive = at("dive");
    const stack = at("stack");
    // `stack` doesn't list fov: it keeps the dive's.
    expect(poses[stack * POSE_LEN + CH.fov]).toBe(poses[dive * POSE_LEN + CH.fov]);
  });
});

describe("resolve", () => {
  const { markers, end } = layout();
  const res = resolve(BEATS, markers, VH, end);

  it("centres each hold where its marker meets the reading line", () => {
    const i = res.beats.findIndex((b) => b.id === "cap-1");
    const m = markers.get("cap-1")!;
    const centre = m.top + m.height / 2 - READING * VH;
    expect((res.starts[i] + res.ends[i]) / 2).toBeCloseTo(centre, 6);
    expect(res.ends[i] - res.starts[i]).toBeCloseTo((BEATS.find((b) => b.id === "cap-1")!.hold * VH) / 100, 6);
  });

  it("starts the hero's hold at the top of the page", () => {
    expect(res.starts[0]).toBe(0);
    expect(res.ends[0]).toBeGreaterThan(0);
  });

  it("keeps knots in order", () => {
    for (let i = 1; i < res.beats.length; i++) {
      expect(res.starts[i]).toBeGreaterThanOrEqual(res.ends[i - 1]);
      expect(res.ends[i]).toBeGreaterThanOrEqual(res.starts[i]);
    }
  });

  it("drops beats whose marker is missing, without changing later poses", () => {
    // (the stage timeline; work is the only optional section)
    const { markers: noWork, end: e2 } = layout(VH, ["work"]);
    const r2 = resolve(BEATS, noWork, VH, e2);
    expect(r2.beats.some((b) => b.id === "work")).toBe(false);
    const full = buildPoses(BEATS);
    const idx = BEATS.findIndex((b) => b.id === "build-1");
    const kept = r2.beats.findIndex((b) => b.id === "build-1");
    expect([...r2.poses.subarray(kept * POSE_LEN, (kept + 1) * POSE_LEN)]).toEqual([
      ...full.subarray(idx * POSE_LEN, (idx + 1) * POSE_LEN),
    ]);
  });

  it("shrinks overlapping holds to meet instead of reversing them", () => {
    const beats: Beat[] = [
      { id: "a", marker: "a", hold: 60, host: "stage", fit: "sphere", box: "rail", pose: { yaw: 0 } },
      { id: "b", marker: "b", hold: 60, host: "stage", fit: "sphere", box: "rail", pose: { yaw: 10 } },
    ];
    const m: Markers = new Map([
      ["a", { top: 1000, height: 0 }],
      ["b", { top: 1100, height: 0 }],
    ]);
    const r = resolve(beats, m, VH, 5000);
    expect(r.ends[0]).toBeLessThanOrEqual(r.starts[1]);
    expect(r.ends[0]).toBeGreaterThanOrEqual(r.starts[0]);
  });
});

const HOSTS: readonly HostId[] = ["stage", "dock-pricing", "dock-faq", "dock-closing"];

describe("per-host timelines", () => {
  const { markers, end } = layout();

  it("give every beat to exactly one host", () => {
    const total = HOSTS.reduce((n, h) => n + resolve(BEATS, markers, VH, end, h).beats.length, 0);
    expect(total).toBe(BEATS.length);
  });

  it("are exact throughout every hold", () => {
    const out = new Float32Array(POSE_LEN);
    for (const host of HOSTS) {
      const res = resolve(BEATS, markers, VH, end, host);
      for (let i = 0; i < res.beats.length; i++) {
        if (res.ends[i] === res.starts[i]) continue;
        for (const f of [0, 0.5, 1]) {
          samplePose(res, res.starts[i] + f * (res.ends[i] - res.starts[i]), out);
          for (let c = 0; c < POSE_LEN; c++) expect(out[c], `${res.beats[i].id}[${c}]`).toBeCloseTo(res.poses[i * POSE_LEN + c], 5);
        }
      }
    }
  });

  it("power the closing ring on as its dock rises, not before", () => {
    const res = resolve(BEATS, markers, VH, end, "dock-closing");
    const out = new Float32Array(POSE_LEN);
    samplePose(res, res.starts[0] - 1, out);
    expect(out[CH.power]).toBe(0);
    samplePose(res, (res.starts[0] + res.starts[1]) / 2, out);
    expect(out[CH.power]).toBeGreaterThan(0.2);
    expect(out[CH.power]).toBeLessThan(0.8);
    samplePose(res, res.ends[1], out);
    expect(out[CH.power]).toBe(1);
  });
});

describe("samplePose", () => {
  const { markers, end } = layout();
  const res = resolve(BEATS, markers, VH, end);
  const out = new Float32Array(POSE_LEN);
  const poses = res.poses;

  it("clamps before the first and after the last beat", () => {
    samplePose(res, -500, out);
    expect(out[CH.tilt]).toBeCloseTo(poses[CH.tilt], 6);
    samplePose(res, end + 5000, out);
    const last = res.beats.length - 1;
    expect(res.beats[last].id).toBe("studio");
    expect(out[CH.yaw]).toBeCloseTo(poses[last * POSE_LEN + CH.yaw], 6);
  });

  // A jump would move a channel by most of its range in one pixel; the fastest
  // designed travel (process steps, 15svh) moves ~4% per px at 900px tall.
  it("never jumps: no channel moves more than 5% of its range between adjacent pixels", () => {
    const lo = new Float32Array(POSE_LEN).fill(Infinity);
    const hi = new Float32Array(POSE_LEN).fill(-Infinity);
    for (let i = 0; i < res.beats.length; i++) {
      for (let c = 0; c < POSE_LEN; c++) {
        lo[c] = Math.min(lo[c], poses[i * POSE_LEN + c]);
        hi[c] = Math.max(hi[c], poses[i * POSE_LEN + c]);
      }
    }
    const prev = new Float32Array(POSE_LEN);
    samplePose(res, 0, prev);
    const worst: Record<string, number> = {};
    for (let y = 1; y <= end; y += 1) {
      samplePose(res, y, out);
      for (let c = 0; c < POSE_LEN; c++) {
        const range = hi[c] - lo[c];
        if (range === 0) continue;
        const step = Math.abs(out[c] - prev[c]) / range;
        worst[c] = Math.max(worst[c] ?? 0, step);
      }
      prev.set(out);
    }
    // `ambient` and `lean` are gates (idle motion / pointer lean allowed), not
    // drawn values: they switch at a hold's edge, and the renderer damps lean.
    const gates = new Set<number>([CH.ambient, CH.lean]);
    for (const [name, c] of channelNames) {
      if (gates.has(c)) continue;
      for (let k = 0; k < width(c); k++) {
        expect(worst[c + k] ?? 0, `${name}${width(c) > 1 ? k : ""}`).toBeLessThanOrEqual(0.05);
      }
    }
  });

  it("arrives at and leaves every hold with (almost) no velocity", () => {
    for (let i = 0; i < res.beats.length - 1; i++) {
      const span = res.starts[i + 1] - res.ends[i];
      if (span <= 0 || res.beats[i + 1].hold === 0 || res.beats[i].hold === 0) continue;
      const a = new Float32Array(POSE_LEN);
      const b = new Float32Array(POSE_LEN);
      samplePose(res, res.ends[i], a);
      samplePose(res, res.ends[i] + span * 0.01, b);
      const tiltDelta = Math.abs(poses[(i + 1) * POSE_LEN + CH.tilt] - poses[i * POSE_LEN + CH.tilt]);
      expect(Math.abs(b[CH.tilt] - a[CH.tilt])).toBeLessThanOrEqual(tiltDelta * 0.01 + 1e-4);
    }
  });

  it("drops idle motion and pointer lean while travelling", () => {
    for (let i = 0; i < res.beats.length - 1; i++) {
      const mid = (res.ends[i] + res.starts[i + 1]) / 2;
      if (res.starts[i + 1] - res.ends[i] < 2) continue;
      samplePose(res, mid, out);
      expect(out[CH.ambient]).toBe(0);
      expect(out[CH.lean]).toBe(0);
    }
  });

  it("keeps the camera inside its speed limits (per 100svh of travel)", () => {
    const deg = (a: readonly number[], b: readonly number[]) =>
      (Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180) / Math.PI;
    const holds = res.beats.map((_, i) => i).filter((i) => res.beats[i].hold > 0);
    for (let h = 0; h < holds.length - 1; h++) {
      const i = holds[h];
      const j = holds[h + 1];
      if (res.beats[i].host !== "stage" || res.beats[j].host !== "stage") continue;
      const y0 = res.ends[i];
      const y1 = res.starts[j];
      const svh = ((y1 - y0) / VH) * 100;
      let turned = 0;
      let prevAxis: readonly number[] | null = null;
      for (let s = 0; s <= 200; s++) {
        samplePose(res, y0 + ((y1 - y0) * s) / 200, out);
        const axis = axisInCamera(out);
        if (prevAxis) turned += deg(prevAxis, axis);
        prevAxis = axis;
      }
      const a = poses.subarray(i * POSE_LEN, (i + 1) * POSE_LEN);
      const b = poses.subarray(j * POSE_LEN, (j + 1) * POSE_LEN);
      const label = `${res.beats[i].id} → ${res.beats[j].id}`;
      expect((Math.abs(b[CH.yaw] - a[CH.yaw]) / svh) * 100, `${label} yaw`).toBeLessThanOrEqual(45.5);
      expect((Math.abs(b[CH.pitch] - a[CH.pitch]) / svh) * 100, `${label} pitch`).toBeLessThanOrEqual(20.5);
      expect((turned / svh) * 100, `${label} axis`).toBeLessThanOrEqual(66);
    }
  });
});

describe("beatAt", () => {
  const { markers, end } = layout();
  const res = resolve(BEATS, markers, VH, end);
  const i = res.beats.findIndex((b) => b.id === "cap-0");
  const j = i + 1;
  const y = (t: number) => res.ends[i] + t * (res.starts[j] - res.ends[i]);

  it("is the beat whose hold contains the scroll", () => {
    expect(beatAt(res, (res.starts[i] + res.ends[i]) / 2, null)).toBe(i);
  });

  it("switches at the middle of a travel, with hysteresis", () => {
    expect(beatAt(res, y(0.49), null)).toBe(i);
    expect(beatAt(res, y(0.51), null)).toBe(j);
    expect(beatAt(res, y(0.53), i)).toBe(i);
    expect(beatAt(res, y(0.56), i)).toBe(j);
    expect(beatAt(res, y(0.47), j)).toBe(j);
    expect(beatAt(res, y(0.44), j)).toBe(i);
  });

  it("clamps to the first and last beat", () => {
    expect(beatAt(res, -100, null)).toBe(0);
    expect(beatAt(res, end + 10_000, null)).toBe(res.beats.length - 1);
  });
});

describe("blendPose", () => {
  it("is exact at the ends and linear between", () => {
    const a = new Float32Array(POSE_LEN).fill(0);
    const b = new Float32Array(POSE_LEN).fill(10);
    const out = new Float32Array(POSE_LEN);
    blendPose(a, b, 0, out);
    expect(out[0]).toBe(0);
    blendPose(a, b, 1, out);
    expect(out[3]).toBe(10);
    blendPose(a, b, 0.25, out);
    expect(out[7]).toBeCloseTo(2.5, 6);
  });
});

describe("axisInCamera", () => {
  it("points straight at the camera for a face-on pose and up for the tower", () => {
    const face = new Float32Array(POSE_LEN);
    const [x, y, z] = axisInCamera(face);
    expect(x).toBeCloseTo(0, 6);
    expect(y).toBeCloseTo(0, 6);
    expect(z).toBeCloseTo(1, 6);
    const tower = new Float32Array(POSE_LEN);
    tower[CH.tilt] = 90;
    tower[CH.pitch] = 22;
    const up = axisInCamera(tower);
    // Looking down 22° at a vertical axis: it leans toward the viewer by sin(22°).
    expect(up[1]).toBeCloseTo(Math.cos((22 * Math.PI) / 180), 5);
    expect(up[2]).toBeCloseTo(Math.sin((22 * Math.PI) / 180), 5);
  });
});
