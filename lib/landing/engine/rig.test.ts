import { describe, expect, it } from "vitest";

import { cameraBasis, type Vec3 } from "./camera";
import { EXPLODE_GAP, EXTENTS, GLYPH_Z, MODULE_Z } from "./geometry/index";
import { AGENCY, LIFT, rig, transform } from "./rig";
import { CH, POSE_LEN } from "./types";

type Channels = Partial<Record<Exclude<keyof typeof CH, "lift">, number>> & { readonly lift?: readonly number[] };

function pose({ lift, ...set }: Channels = {}): Float32Array {
  const p = new Float32Array(POSE_LEN);
  p[CH.fov] = 24;
  p[CH.align] = 1;
  for (const [k, v] of Object.entries(set)) p[CH[k as keyof typeof CH]] = v;
  lift?.forEach((x, i) => (p[CH.lift + i] = x));
  return p;
}

const close = (a: Vec3, b: Vec3, digits = 9) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], digits));
const translation = (m: Float32Array, k: number): Vec3 => [m[k * 16 + 12], m[k * 16 + 13], m[k * 16 + 14]];

describe("rig", () => {
  it("puts the face's CORE circle on the axis, facing the camera, at tilt 0", () => {
    const r = rig(pose());
    close(r.face, [0, 0, MODULE_Z[0] + GLYPH_Z], 6);
    close(r.axis, [0, 0, 1]);
  });

  it("stands the engine up at tilt 90, face on top", () => {
    const r = rig(pose({ tilt: 90 }));
    close(r.face, [0, MODULE_Z[0] + GLYPH_Z, 0], 6);
    close(r.axis, [0, 1, 0], 6);
  });

  it("explodes modules along the axis by their gaps", () => {
    const r = rig(pose({ explode: 1 }));
    for (let k = 0; k < 5; k++) close(translation(r.models, k), [0, 0, MODULE_Z[k] + EXPLODE_GAP[k]], 5);
  });

  it("pulls a lifted module straight toward the camera", () => {
    const at = rig(pose({ yaw: 30, pitch: 10 }));
    const lifted = rig(pose({ yaw: 30, pitch: 10, lift: [0, 0, 1, 0, 0] }));
    const { back } = cameraBasis(30, 10);
    const a = translation(at.models, 2);
    const b = translation(lifted.models, 2);
    close([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [back[0] * LIFT, back[1] * LIFT, back[2] * LIFT], 5);
    close(translation(lifted.models, 1), translation(at.models, 1), 9);
  });

  it("frames the whole engine inside its sphere when unfocused, assembled or exploded", () => {
    for (const explode of [0, 0.5, 1]) {
      const r = rig(pose({ tilt: 90, explode }));
      for (let k = 0; k < 5; k++) {
        const e = EXTENTS[k];
        for (const z of [e.zMin, e.zMax]) {
          for (let a = 0; a < 8; a++) {
            const t = (a / 8) * Math.PI * 2;
            const p = transform(r.models, k, [e.radius * Math.sin(t), e.radius * Math.cos(t), z]);
            const d = Math.hypot(p[0] - r.sphere.c[0], p[1] - r.sphere.c[1], p[2] - r.sphere.c[2]);
            expect(d).toBeLessThanOrEqual(r.sphere.r + 1e-5);
          }
        }
      }
    }
  });

  it("frames just the aimed module when focused, wherever it has been pulled", () => {
    const r = rig(pose({ tilt: 90, explode: 1, aim: 3, focus: 1, lift: [0, 0, 0, 1, 0], yaw: -38, pitch: 22 }));
    const e = EXTENTS[3];
    const centre = transform(r.models, 3, [0, 0, (e.zMin + e.zMax) / 2]);
    close(r.sphere.c, centre, 5);
    expect(r.sphere.r).toBeCloseTo(Math.hypot((e.zMax - e.zMin) / 2, e.radius), 6);
  });

  it("knocks the modules out of line only in the agency state", () => {
    const ours = rig(pose({ align: 1 }));
    const agency = rig(pose({ align: 0 }));
    for (let k = 0; k < 5; k++) {
      const a = translation(ours.models, k);
      const b = translation(agency.models, k);
      const moved = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      if (AGENCY.shift[k] === 0 && AGENCY.gap[k] === 0) expect(moved).toBeCloseTo(0, 9);
      else expect(moved).toBeGreaterThan(0.05);
    }
  });
});
