import { describe, expect, it } from "vitest";

import {
  BEATS,
  READING,
  axisInCamera,
  beatAt,
  blendPose,
  buildPoses,
  resolve,
  samplePose,
  type Markers,
} from "./choreography";
import { grid } from "./layout";
import { SIGNATURE } from "./beats";
import { layoutPage } from "./scenes.fixture";
import { CH, POSE_LEN, type Beat } from "./types";

const VH = 900;
const G = grid(1440, VH);

const channelNames = Object.entries(CH) as [string, number][];
const width = (c: number) => (c === CH.lift || c === CH.arc ? 5 : 1);
const idOf = (res: { beats: readonly Beat[] }, i: number) => res.beats[i].id;

describe("the beat table", () => {
  it("has unique ids, and every scene's beats together and in page order", () => {
    const ids = new Set(BEATS.map((b) => b.id));
    expect(ids.size).toBe(BEATS.length);
    const scenes = BEATS.map((b) => b.scene).filter((s, i, a) => i === 0 || a[i - 1] !== s);
    expect(new Set(scenes).size).toBe(scenes.length);
  });

  it("walks the capabilities in order, each turning its arc to 12 o'clock, and completes at the finale", () => {
    const caps = BEATS.filter((b) => b.dom?.cap !== undefined);
    expect(caps.map((b) => b.dom!.cap)).toEqual([0, 1, 2, 3]);
    expect(caps.map((b) => b.pose.dial)).toEqual([-72, -144, -216, -288]);
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
      expect(p[CH.fill]).toBeLessThanOrEqual(1.3);
      expect(p[CH.portal]).toBeGreaterThanOrEqual(0);
      expect(p[CH.portal]).toBeLessThanOrEqual(1);
    }
  });

  it("derives the fit blend from each beat's fit, never from the pose above", () => {
    const poses = buildPoses(BEATS);
    BEATS.forEach((b, i) => expect(poses[i * POSE_LEN + CH.circle], b.id).toBe(b.fit === "circle" ? 1 : 0));
  });

  it("carries unlisted channels over from the beat above", () => {
    const poses = buildPoses(BEATS);
    const at = (id: string) => BEATS.findIndex((b) => b.id === id);
    // `stack` doesn't list fov: it keeps the dive's.
    expect(poses[at("stack") * POSE_LEN + CH.fov]).toBe(poses[at("dive") * POSE_LEN + CH.fov]);
  });
});

describe("resolve", () => {
  const { markers, end } = layoutPage(VH);
  const res = resolve(BEATS, markers, VH, end, G);

  it("centres each hold where its marker meets the reading line", () => {
    const i = res.beats.findIndex((b) => b.id === "cap-1");
    const m = markers.get("cap-1")!;
    const centre = m.top + m.height / 2 - READING * VH;
    expect((res.starts[i] + res.ends[i]) / 2).toBeCloseTo(centre, 6);
    expect(res.ends[i] - res.starts[i]).toBeCloseTo((BEATS.find((b) => b.id === "cap-1")!.hold * VH) / 100, 6);
  });

  it("starts the hero's hold at the top of the page", () => {
    expect(res.starts[0]).toBeCloseTo(0, 6);
    expect(res.ends[0]).toBeGreaterThan(0);
  });

  it("keeps knots in order, travelling exactly the table's lengths inside a scene", () => {
    for (let i = 1; i < res.beats.length; i++) {
      expect(res.starts[i]).toBeGreaterThanOrEqual(res.ends[i - 1]);
      expect(res.ends[i]).toBeGreaterThanOrEqual(res.starts[i]);
      const b = res.beats[i];
      if (b.scene === res.beats[i - 1].scene && b.travel > 0) {
        expect((res.starts[i] - res.ends[i - 1]) / (VH / 100), b.id).toBeCloseTo(b.travel, 6);
      }
    }
  });

  it("bakes each beat's target circle from its grid box", () => {
    const hero = res.poses.subarray(0, POSE_LEN);
    // Columns 6–12 at 1440: 622 → 1368; the ring at 88% of the box's width.
    expect(hero[CH.cx]).toBeCloseTo(995, 3);
    expect(hero[CH.cr]).toBeCloseTo((0.88 * 746) / 2, 3);
    const caps = res.beats.findIndex((b) => b.id === "cap-0");
    // The porthole: columns 4–12 (402 → 1368), the full height.
    expect(res.poses[caps * POSE_LEN + CH.cx]).toBeCloseTo(885, 3);
    expect(res.poses[caps * POSE_LEN + CH.cy]).toBeCloseTo(450, 3);
  });

  it("drops beats whose marker is missing, without changing later poses", () => {
    const { markers: noWork, end: e2 } = layoutPage(VH, ["work"]);
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
    const base = BEATS[0];
    const beats: Beat[] = [
      { ...base, id: "a", hold: 60, pose: { yaw: 0 } },
      { ...base, id: "b", hold: 60, pose: { yaw: 10 } },
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

describe("samplePose", () => {
  const { markers, end } = layoutPage(VH);
  const res = resolve(BEATS, markers, VH, end, G);
  const out = new Float32Array(POSE_LEN);
  const poses = res.poses;

  it("is exact throughout every hold", () => {
    for (let i = 0; i < res.beats.length; i++) {
      if (res.ends[i] === res.starts[i]) continue;
      for (const f of [0, 0.5, 1]) {
        samplePose(res, res.starts[i] + f * (res.ends[i] - res.starts[i]), out);
        for (let c = 0; c < POSE_LEN; c++) expect(out[c], `${idOf(res, i)}[${c}]`).toBeCloseTo(poses[i * POSE_LEN + c], 4);
      }
    }
  });

  it("clamps before the first and after the last beat", () => {
    samplePose(res, -500, out);
    expect(out[CH.tilt]).toBeCloseTo(poses[CH.tilt], 6);
    samplePose(res, end + 5000, out);
    const last = res.beats.length - 1;
    expect(res.beats[last].id).toBe("closing");
    expect(out[CH.power]).toBeCloseTo(poses[last * POSE_LEN + CH.power], 6);
  });

  it("powers the closing ring on across its travel, not before", () => {
    const i = res.beats.findIndex((b) => b.id === "closing");
    samplePose(res, res.ends[i - 1] - 1, out);
    expect(out[CH.power]).toBeLessThan(0.05);
    samplePose(res, (res.ends[i - 1] + res.starts[i]) / 2, out);
    expect(out[CH.power]).toBeGreaterThan(0.2);
    expect(out[CH.power]).toBeLessThan(0.8);
    samplePose(res, res.ends[i], out);
    expect(out[CH.power]).toBe(1);
  });

  // A jump would move a channel by most of its range in one pixel.
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
    const worst: Record<number, number> = {};
    for (let y = 1; y <= end; y += 1) {
      samplePose(res, y, out);
      for (let c = 0; c < POSE_LEN; c++) {
        const range = hi[c] - lo[c];
        if (range === 0) continue;
        worst[c] = Math.max(worst[c] ?? 0, Math.abs(out[c] - prev[c]) / range);
      }
      prev.set(out);
    }
    // Gates (idle motion, pointer lean) switch at a hold's edge; the fit blend
    // and the baked circle are continuous but may cover their range fast.
    const gates = new Set<number>([CH.ambient, CH.lean]);
    for (const [name, c] of channelNames) {
      if (gates.has(c)) continue;
      for (let k = 0; k < width(c); k++) {
        expect(worst[c + k] ?? 0, `${name}${width(c) > 1 ? k : ""}`).toBeLessThanOrEqual(0.05);
      }
    }
  });

  it("drops idle motion and pointer lean while travelling", () => {
    for (let i = 0; i < res.beats.length - 1; i++) {
      if (res.starts[i + 1] - res.ends[i] < 2) continue;
      samplePose(res, (res.ends[i] + res.starts[i + 1]) / 2, out);
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
      const label = `${idOf(res, i)} → ${idOf(res, j)}`;
      const per100 = (v: number) => (v / svh) * 100;
      expect(per100(Math.abs(b[CH.yaw] - a[CH.yaw])), `${label} yaw`).toBeLessThanOrEqual(45.5);
      expect(per100(Math.abs(b[CH.pitch] - a[CH.pitch])), `${label} pitch`).toBeLessThanOrEqual(20.5);
      // Signature moves (the tower turning face-on, the bleach into the build) may turn faster.
      expect(per100(turned), `${label} axis`).toBeLessThanOrEqual(SIGNATURE.has(res.beats[j].id) ? 160 : 66);
      // Lateral carry: at most half the viewport per 50svh.
      expect(per100(Math.abs(b[CH.cx] - a[CH.cx])), `${label} carry`).toBeLessThanOrEqual(1440 + 1);
    }
  });
});

describe("beatAt", () => {
  const { markers, end } = layoutPage(VH);
  const res = resolve(BEATS, markers, VH, end, G);
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
    expect(up[1]).toBeCloseTo(Math.cos((22 * Math.PI) / 180), 5);
    expect(up[2]).toBeCloseTo(Math.sin((22 * Math.PI) / 180), 5);
  });
});
