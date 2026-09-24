import { describe, expect, it } from "vitest";

import { FACE_R, buildCamera, engineToWorld, hull, project, projectCircle, type CameraSpec, type Vec3 } from "./camera";
import { fitCamera } from "./fit";

const CANVAS = { w: 1440, h: 900 };
const FACE_ON: CameraSpec = {
  yaw: 0,
  pitch: 0,
  fov: 24,
  circle: 1,
  sphere: { c: [0, 0, 0], r: 3 },
  face: [0, 0, 1.44],
  target: { cx: 1000, cy: 450, r: 373 },
  canvas: CANVAS,
};

/** Points on a circle of radius r around c, in the plane spanned by u and v. */
function ring(c: Vec3, u: Vec3, v: Vec3, r: number, n = 64): Vec3[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const k = r * Math.cos(a);
    const m = r * Math.sin(a);
    return [c[0] + u[0] * k + v[0] * m, c[1] + u[1] * k + v[1] * m, c[2] + u[2] * k + v[2] * m] as Vec3;
  });
}

describe("buildCamera", () => {
  it("lands the face's CORE circle on the target circle, face-on, to half a pixel", () => {
    const cam = buildCamera(FACE_ON)!;
    for (const p of ring(FACE_ON.face, [1, 0, 0], [0, 1, 0], FACE_R)) {
      const s = project(cam, p)!;
      expect(Math.hypot(s.x - 1000, s.y - 450)).toBeCloseTo(373, 0);
      expect(Math.abs(Math.hypot(s.x - 1000, s.y - 450) - 373)).toBeLessThan(0.5);
    }
  });

  it("puts the look-at point on the target centre, wherever that is (lens shift, no skew)", () => {
    for (const target of [
      { cx: 200, cy: 120, r: 100 },
      { cx: 1300, cy: 800, r: 60 },
    ]) {
      const cam = buildCamera({ ...FACE_ON, circle: 0, target })!;
      const s = project(cam, FACE_ON.sphere.c)!;
      expect(s.x).toBeCloseTo(target.cx, 6);
      expect(s.y).toBeCloseTo(target.cy, 6);
    }
  });

  it("frames the bounding sphere's silhouette at the target radius (sphere fit)", () => {
    const spec: CameraSpec = { ...FACE_ON, yaw: -38, pitch: 22, circle: 0, sphere: { c: [0.2, -0.4, 0.1], r: 4.1 } };
    const cam = buildCamera(spec)!;
    const c = spec.sphere.c;
    let max = 0;
    for (let i = 0; i <= 200; i++) {
      const th = (i / 200) * Math.PI;
      for (let j = 0; j < 400; j++) {
        const ph = (j / 400) * Math.PI * 2;
        const p: Vec3 = [
          c[0] + spec.sphere.r * Math.sin(th) * Math.cos(ph),
          c[1] + spec.sphere.r * Math.cos(th),
          c[2] + spec.sphere.r * Math.sin(th) * Math.sin(ph),
        ];
        const s = project(cam, p)!;
        max = Math.max(max, Math.hypot(s.x - spec.target.cx, s.y - spec.target.cy));
      }
    }
    expect(Math.abs(max - spec.target.r)).toBeLessThan(0.5);
  });

  it("agrees with fitCamera's distance for both fits", () => {
    const circle = buildCamera(FACE_ON)!;
    const fitC = fitCamera({
      canvas: CANVAS,
      box: { x: 1000 - 373, y: 450 - 373, w: 746, h: 746 },
      kind: "circle",
      radius: FACE_R,
      fovDeg: 24,
      fill: 1,
      offX: 0,
      offY: 0,
    })!;
    expect(circle.distance).toBeCloseTo(fitC.distance, 6);
    const sphere = buildCamera({ ...FACE_ON, circle: 0 })!;
    const fitS = fitCamera({
      canvas: CANVAS,
      box: { x: 1000 - 373, y: 450 - 373, w: 746, h: 746 },
      kind: "sphere",
      radius: 3,
      fovDeg: 24,
      fill: 1,
      offX: 0,
      offY: 0,
    })!;
    expect(sphere.distance).toBeCloseTo(fitS.distance, 6);
  });

  it("blends the two fits continuously", () => {
    const a = buildCamera({ ...FACE_ON, circle: 0 })!.distance;
    const b = buildCamera({ ...FACE_ON, circle: 1 })!.distance;
    const mid = buildCamera({ ...FACE_ON, circle: 0.5 })!.distance;
    expect(mid).toBeCloseTo((a + b) / 2, 6);
  });

  it("returns null instead of NaN for an empty canvas, radius or target", () => {
    expect(buildCamera({ ...FACE_ON, canvas: { w: 0, h: 900 } })).toBeNull();
    expect(buildCamera({ ...FACE_ON, target: { cx: 10, cy: 10, r: 0 } })).toBeNull();
    expect(buildCamera({ ...FACE_ON, sphere: { c: [0, 0, 0], r: 0 }, circle: 0 })).toBeNull();
    expect(buildCamera({ ...FACE_ON, fov: Number.NaN })).toBeNull();
  });

  it("writes column-major matrices whose projection agrees with project()", () => {
    const cam = buildCamera({ ...FACE_ON, yaw: 14, pitch: 5, target: { cx: 400, cy: 500, r: 300 } })!;
    const p: Vec3 = [0.7, -0.3, 1.1];
    const v = cam.view;
    const vx = v[0] * p[0] + v[4] * p[1] + v[8] * p[2] + v[12];
    const vy = v[1] * p[0] + v[5] * p[1] + v[9] * p[2] + v[13];
    const vz = v[2] * p[0] + v[6] * p[1] + v[10] * p[2] + v[14];
    const P = cam.proj;
    const cx = P[0] * vx + P[4] * vy + P[8] * vz + P[12];
    const cy = P[1] * vx + P[5] * vy + P[9] * vz + P[13];
    const cw = P[3] * vx + P[7] * vy + P[11] * vz + P[15];
    const sx = ((cx / cw + 1) / 2) * CANVAS.w;
    const sy = ((1 - cy / cw) / 2) * CANVAS.h;
    const s = project(cam, p)!;
    expect(sx).toBeCloseTo(s.x, 4);
    expect(sy).toBeCloseTo(s.y, 4);
  });
});

describe("projectCircle", () => {
  it("is the exact circle for a face-on circle", () => {
    const cam = buildCamera(FACE_ON)!;
    const e = projectCircle(cam, FACE_ON.face, [0, 0, 1], FACE_R)!;
    expect(e.cx).toBeCloseTo(1000, 3);
    expect(e.cy).toBeCloseTo(450, 3);
    expect(e.rx).toBeCloseTo(373, 3);
    expect(e.ry).toBeCloseTo(373, 3);
  });

  it("stays close to a circle for the hero's slight turn", () => {
    const cam = buildCamera({ ...FACE_ON, yaw: -7, pitch: 3 })!;
    const n = engineToWorld(0, [0, 0, 1]);
    const e = projectCircle(cam, FACE_ON.face, n, FACE_R)!;
    expect(e.ry / e.rx).toBeGreaterThan(0.97);
    expect(e.ry / e.rx).toBeLessThan(1.03);
  });
});

describe("engineToWorld", () => {
  it("points the axis at the camera at tilt 0 and straight up at tilt 90", () => {
    expect(engineToWorld(0, [0, 0, 1])).toEqual([0, 0, 1]);
    const up = engineToWorld(90, [0, 0, 1]);
    expect(up[0]).toBeCloseTo(0, 9);
    expect(up[1]).toBeCloseTo(1, 9);
    expect(up[2]).toBeCloseTo(0, 9);
  });
});

describe("hull", () => {
  it("bounds every projected point, and is null when nothing is in front", () => {
    const cam = buildCamera(FACE_ON)!;
    const pts = ring(FACE_ON.face, [1, 0, 0], [0, 1, 0], FACE_R);
    const box = hull(cam, pts)!;
    expect(box.x).toBeCloseTo(1000 - 373, 0);
    expect(box.w).toBeCloseTo(746, 0);
    expect(hull(cam, [[0, 0, 1e6]])).toBeNull();
  });
});
