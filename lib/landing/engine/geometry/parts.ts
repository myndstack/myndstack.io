/**
 * The engine's machined parts, procedurally: every profile carries its
 * chamfers (bright-cut polished edges are what read as machined), and the
 * modules seat against each other with a hairline seam. Units are world units
 * (the face's CORE box has radius 2.1); the axis is local +z, face forward.
 */
import {
  MAT,
  NO_HUE,
  ROTOR,
  SPECTRUM_HUE,
  annulus,
  box,
  cylinder,
  emptyMesh,
  icosphere,
  lathe,
  latheEdges,
  merge,
  orbit,
  place,
  quadFacing,
  vertex,
  type Mesh,
  type ProfilePoint,
} from "./mesh";

/** Level of detail: radial segments, gear samples per tooth, core subdivision, piston sides. */
export const LOD = [
  { radial: 128, tooth: 12, core: 2, piston: 16 },
  { radial: 96, tooth: 8, core: 2, piston: 12 },
  { radial: 48, tooth: 5, core: 1, piston: 8 },
] as const;
export type Lod = 0 | 1 | 2;

const HUE = { lime: 0, ai: 1, product: 2, design: 3, arch: 4 } as const;
const SEAM = 0.02;

// ---- Profiles (counter-clockwise in r, z) -----------------------------------

/** The face bezel: knurled outer wall, engraved top ring, chamfers everywhere. */
export const BEZEL: readonly ProfilePoint[] = [
  { r: 1.98, z: -0.3, mat: MAT.body },
  { r: 2.26, z: -0.3, mat: MAT.edge },
  { r: 2.3, z: -0.26, mat: MAT.knurl },
  { r: 2.3, z: 0.14, mat: MAT.edge },
  { r: 2.26, z: 0.18, mat: MAT.body },
  { r: 2.06, z: 0.22, mat: MAT.engrave },
  { r: 2.02, z: 0.22, mat: MAT.edge },
  { r: 1.98, z: 0.17, mat: MAT.body },
  { r: 1.98, z: -0.3 },
];

export const INTERFACE: readonly ProfilePoint[] = [
  { r: 1.62, z: -0.3, mat: MAT.body },
  { r: 1.98, z: -0.3, mat: MAT.edge },
  { r: 2.02, z: -0.26, mat: MAT.knurl },
  { r: 2.02, z: 0.26, mat: MAT.edge },
  { r: 1.98, z: 0.3, mat: MAT.body },
  { r: 1.66, z: 0.3, mat: MAT.edge },
  { r: 1.62, z: 0.26, mat: MAT.body },
  { r: 1.62, z: -0.3 },
];

export const HOUSING: readonly ProfilePoint[] = [
  { r: 0.95, z: -0.5, mat: MAT.body },
  { r: 1.64, z: -0.5, mat: MAT.edge },
  { r: 1.7, z: -0.44, mat: MAT.body },
  { r: 1.7, z: 0.44, mat: MAT.edge },
  { r: 1.64, z: 0.5, mat: MAT.body },
  { r: 1.0, z: 0.5, mat: MAT.edge },
  { r: 0.95, z: 0.45, mat: MAT.body },
  { r: 0.95, z: -0.5 },
];

export const HUB: readonly ProfilePoint[] = [
  { r: 1.12, z: -0.3, mat: MAT.body },
  { r: 1.26, z: -0.3, mat: MAT.edge },
  { r: 1.3, z: -0.26, mat: MAT.body },
  { r: 1.3, z: 0.26, mat: MAT.edge },
  { r: 1.26, z: 0.3, mat: MAT.body },
  { r: 1.12, z: 0.3, mat: MAT.body },
  { r: 1.12, z: -0.3 },
];

export const FLANGE: readonly ProfilePoint[] = [
  { r: 0.62, z: -0.25, mat: MAT.body },
  { r: 2.28, z: -0.25, mat: MAT.edge },
  { r: 2.34, z: -0.19, mat: MAT.body },
  { r: 2.34, z: 0.19, mat: MAT.edge },
  { r: 2.28, z: 0.25, mat: MAT.body },
  { r: 0.68, z: 0.25, mat: MAT.edge },
  { r: 0.62, z: 0.19, mat: MAT.body },
  { r: 0.62, z: -0.25 },
];

export const REAR_HUB: readonly ProfilePoint[] = [
  { r: 0.2, z: -1.1, mat: MAT.body },
  { r: 0.58, z: -1.1, mat: MAT.edge },
  { r: 0.62, z: -1.06, mat: MAT.body },
  { r: 0.62, z: -0.25 },
];

/** The gear: 44 teeth between these radii, 0.5 thick, 0.03 chamfer on every edge. */
export const GEAR = { teeth: 44, root: 1.62, tip: 1.9, hole: 1.3, half: 0.25, bevel: 0.03 } as const;

/** Tooth shape along one pitch, 0 → 1: root, flank, land, flank, root (smooth ramps, involute-like). */
function toothRadius(u: number): number {
  const ramp = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));
  let lift: number;
  if (u < 0.12 || u > 0.68) lift = 0;
  else if (u < 0.28) lift = ramp((u - 0.12) / 0.16);
  else if (u <= 0.52) lift = 1;
  else lift = 1 - ramp((u - 0.52) / 0.16);
  return GEAR.root + (GEAR.tip - GEAR.root) * lift;
}

// ---- Module builders -----------------------------------------------------------

export type ModuleGeometry = {
  /** Metal surfaces (one draw call per module). */
  readonly surface: Mesh;
  /** Blueprint feature edges, line segment pairs. */
  readonly edges: number[];
  /** Local z extent of everything (for bounds). */
  readonly zMin: number;
  readonly zMax: number;
  /** The mating faces a neighbour seats against (bolt heads can nest around the next part). */
  readonly seatBack: number;
  readonly seatFront: number;
  /** Largest radius. */
  readonly radius: number;
};

const ring = (r0: number, r1: number, z: number, radial: number, hue: number) =>
  annulus(r0, r1, z, radial, { material: MAT.inlay, hue });

export function faceModule(lod: Lod): ModuleGeometry {
  const { radial } = LOD[lod];
  const surface = merge([
    lathe(BEZEL, radial, { rotor: ROTOR.bezel }),
    // Dial plate (dark), under the glass.
    annulus(0, 1.98, 0, radial, { material: MAT.dial }),
    // Glass, just below the bezel's inner lip.
    annulus(0, 1.98, 0.16, radial, { material: MAT.glass }),
  ]);
  return { surface, edges: latheEdges(BEZEL, radial), zMin: -0.3, zMax: 0.22, seatBack: -0.3, seatFront: 0.22, radius: 2.3 };
}

export function interfaceModule(lod: Lod): ModuleGeometry {
  const { radial } = LOD[lod];
  const surface = merge([lathe(INTERFACE, radial, { rotor: ROTOR.interface }), ring(1.76, 1.8, 0.301, radial, HUE.product)]);
  return { surface, edges: latheEdges(INTERFACE, radial), zMin: -0.3, zMax: 0.3, seatBack: -0.3, seatFront: 0.3, radius: 2.02 };
}

export function modelsModule(lod: Lod): ModuleGeometry {
  const { radial, core, piston } = LOD[lod];
  const parts: Mesh[] = [lathe(HOUSING, radial, {}), ring(1.4, 1.44, 0.501, radial, HUE.ai)];
  // Twelve vent slots recessed into the outer wall.
  for (let i = 0; i < 12; i++) {
    parts.push(place(box([1.705, 0, 0], [0.012, 0.22, 0.62], { material: MAT.vent }), 90 - (i * 360) / 12 - 15, [0, 0, 0]));
  }
  // Ten pistons around the wall.
  for (let i = 0; i < 10; i++) parts.push(orbit(cylinder(0.11, -0.34, 0.34, piston, { material: MAT.body }), 1.84, (i * 360) / 10));
  // The core: a faceted glowing heart.
  parts.push(icosphere(0.52, core, { material: MAT.core, hue: HUE.ai, rotor: ROTOR.core }));
  const cage = icosphereEdges(0.7, 1);
  return {
    surface: merge(parts),
    edges: [...latheEdges(HOUSING, radial), ...cage],
    zMin: -0.5,
    zMax: 0.5,
    seatBack: -0.5,
    seatFront: 0.5,
    radius: 1.95,
  };
}

export function computeModule(lod: Lod): ModuleGeometry {
  const { radial, tooth } = LOD[lod];
  const gear = gearMesh(GEAR.teeth * tooth);
  const parts: Mesh[] = [gear.mesh, lathe(HUB, radial, {}), ring(1.18, 1.21, 0.301, radial, HUE.arch)];
  // Twelve heat pads on the web.
  for (let i = 0; i < 12; i++) {
    parts.push(place(box([0, 1.46, GEAR.half + 0.012], [0.22, 0.08, 0.024], { material: MAT.inlay, hue: HUE.arch }), (i * 360) / 12, [0, 0, 0]));
  }
  return {
    surface: merge(parts),
    edges: [...gear.edges, ...latheEdges(HUB, radial)],
    zMin: -0.3,
    zMax: 0.3,
    seatBack: -0.3,
    seatFront: 0.3,
    radius: GEAR.tip,
  };
}

export function dataModule(lod: Lod): ModuleGeometry {
  const { radial, piston } = LOD[lod];
  const parts: Mesh[] = [lathe(FLANGE, radial, {}), lathe(REAR_HUB, radial, {}), ring(1.8, 1.84, 0.251, radial, HUE.lime)];
  for (let i = 0; i < 12; i++) {
    const a = (i * 360) / 12 + 15;
    // Washer, then a hex bolt head.
    parts.push(orbit(cylinder(0.15, 0.25, 0.28, piston, { material: MAT.fastener }), 2.02, a));
    parts.push(orbit(cylinder(0.1, 0.28, 0.4, 6, { material: MAT.fastener }), 2.02, a));
  }
  // Four rails behind, and cooling fins on the rear hub.
  for (let i = 0; i < 4; i++) parts.push(place(box([0, 1.5, -0.75], [0.22, 0.14, 1.0], { material: MAT.body }), 45 + i * 90, [0, 0, 0]));
  for (let i = 0; i < 5; i++) {
    const z = -0.42 - i * 0.15;
    parts.push(lathe([{ r: 0.62, z: z - 0.015 }, { r: 0.8, z: z - 0.015 }, { r: 0.8, z: z + 0.015 }, { r: 0.62, z: z + 0.015 }], radial, { material: MAT.body }));
  }
  return {
    surface: merge(parts),
    edges: [...latheEdges(FLANGE, radial), ...latheEdges(REAR_HUB, radial)],
    zMin: -1.25,
    zMax: 0.4,
    seatBack: -0.25,
    seatFront: 0.25,
    radius: 2.34,
  };
}

/** The central shaft: runs through every module; a spectrum light-pipe (Delivery). */
export function shaft(z0: number, z1: number): Mesh {
  return cylinder(0.16, z0, z1, 24, { material: MAT.inlay, hue: SPECTRUM_HUE });
}

// ---- The gear ----------------------------------------------------------------------

function gearMesh(samples: number): { mesh: Mesh; edges: number[] } {
  const mesh = emptyMesh();
  const edges: number[] = [];
  const { half, bevel, hole } = GEAR;
  const pts: [number, number, number][] = [];
  for (let j = 0; j <= samples; j++) {
    const a = (j / samples) * Math.PI * 2;
    const u = ((j / samples) * GEAR.teeth) % 1;
    pts.push([a, toothRadius(u), 0]);
  }
  const P = (r: number, a: number, z: number): [number, number, number] => [r * Math.sin(a), r * Math.cos(a), z];
  const rot = { rotor: ROTOR.gear };
  for (let j = 0; j < samples; j++) {
    const [a0, r0] = pts[j];
    const [a1, r1] = pts[j + 1];
    // Outward normal of this outline segment (in the plane).
    const p0 = P(r0, a0, 0);
    const p1 = P(r1, a1, 0);
    const tx = p1[0] - p0[0];
    const ty = p1[1] - p0[1];
    const tl = Math.hypot(tx, ty) || 1;
    // Clockwise travel around the axis: the outward normal is the tangent turned 90° counter-clockwise.
    const n: [number, number, number] = [-ty / tl, tx / tl, 0];
    // Side wall between the chamfers.
    const w = [
      vertex(mesh, P(r0, a0, -half + bevel), n, { material: MAT.body, ...rot }),
      vertex(mesh, P(r1, a1, -half + bevel), n, { material: MAT.body, ...rot }),
      vertex(mesh, P(r1, a1, half - bevel), n, { material: MAT.body, ...rot }),
      vertex(mesh, P(r0, a0, half - bevel), n, { material: MAT.body, ...rot }),
    ];
    quadFacing(mesh, w[0], w[1], w[2], w[3]);
    // Chamfers front and back (polished).
    for (const side of [1, -1] as const) {
      const cn: [number, number, number] = [n[0] * Math.SQRT1_2, n[1] * Math.SQRT1_2, side * Math.SQRT1_2];
      const c0 = vertex(mesh, P(r0, a0, side * (half - bevel)), cn, { material: MAT.edge, ...rot });
      const c1 = vertex(mesh, P(r1, a1, side * (half - bevel)), cn, { material: MAT.edge, ...rot });
      const c2 = vertex(mesh, P(r1 - bevel, a1, side * half), cn, { material: MAT.edge, ...rot });
      const c3 = vertex(mesh, P(r0 - bevel, a0, side * half), cn, { material: MAT.edge, ...rot });
      quadFacing(mesh, c0, c1, c2, c3);
      // Face strip from the chamfer's inner edge to the hub hole.
      const fn: [number, number, number] = [0, 0, side];
      const f0 = vertex(mesh, P(r0 - bevel, a0, side * half), fn, { material: MAT.body, ...rot });
      const f1 = vertex(mesh, P(r1 - bevel, a1, side * half), fn, { material: MAT.body, ...rot });
      const f2 = vertex(mesh, P(hole, a1, side * half), fn, { material: MAT.body, ...rot });
      const f3 = vertex(mesh, P(hole, a0, side * half), fn, { material: MAT.body, ...rot });
      quadFacing(mesh, f0, f1, f2, f3);
      // Blueprint outline of the tooth edge on this face.
      edges.push(...P(r0 - bevel, a0, side * half), ...P(r1 - bevel, a1, side * half));
    }
  }
  return { mesh, edges };
}

/** The core's cage: an icosphere's edges (drawn as lines in every mode). */
function icosphereEdges(radius: number, detail: number): number[] {
  const sphere = icosphere(radius, detail, { material: MAT.body });
  const seen = new Set<string>();
  const out: number[] = [];
  const p = sphere.positions;
  for (let i = 0; i < sphere.indices.length; i += 3) {
    const tri = [sphere.indices[i], sphere.indices[i + 1], sphere.indices[i + 2]];
    for (let k = 0; k < 3; k++) {
      const a = tri[k];
      const b = tri[(k + 1) % 3];
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p[a * 3], p[a * 3 + 1], p[a * 3 + 2], p[b * 3], p[b * 3 + 1], p[b * 3 + 2]);
    }
  }
  return out;
}

// ---- Assembly and explode ---------------------------------------------------------

/** Assembled module positions along the axis, seated with a hairline seam (face first). */
export const MODULE_Z = (() => {
  const data = -1.4;
  const compute = data + 0.25 + 0.3 + SEAM;
  const models = compute + 0.3 + 0.5 + SEAM;
  const iface = models + 0.5 + 0.3 + SEAM;
  const face = iface + 0.3 + 0.3 + SEAM;
  return [face, iface, models, compute, data] as const;
})();

/** How far each module travels when fully exploded (face out front, data out back). */
export const EXPLODE_GAP = [1.2, 0.6, 0, -0.6, -1.2] as const;

/** Each module's share of a global explode: data seats first and the face last (bottom-up), face lifts off first. */
const RANK = [0, 0.25, 0.5, 0.75, 1] as const;
const WINDOW = 0.6;
export function moduleExplode(e: number, module: number): number {
  const x = (e - (1 - WINDOW) * RANK[module]) / WINDOW;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function moduleZ(module: number, e: number): number {
  return MODULE_Z[module] + EXPLODE_GAP[module] * moduleExplode(e, module);
}

export { NO_HUE };
