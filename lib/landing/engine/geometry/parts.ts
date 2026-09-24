/**
 * The engine's machined parts, procedurally: every profile carries its
 * chamfers (bright-cut polished edges are what read as machined), and the
 * modules seat against each other with a hairline seam. Units are world units
 * (the face's CORE box has radius 2.1); the axis is local +z, face forward.
 *
 * It is a computer, not a motor: compute is a finned heat sink with its chips,
 * models a ring of lit blades around the core, data a flange of drive bays
 * with status lights.
 */
import {
  MAT,
  NO_HUE,
  ROTOR,
  SPECTRUM_HUE,
  annulus,
  box,
  cylinder,
  icosphere,
  lathe,
  latheEdges,
  merge,
  place,
  type Mesh,
  type ProfilePoint,
} from "./mesh";

/** Level of detail: radial segments, core subdivision, sides of small cylinders. */
export const LOD = [
  { radial: 128, core: 2, piston: 16 },
  { radial: 96, core: 2, piston: 12 },
  { radial: 48, core: 1, piston: 8 },
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

/** Compute's heat sink: five fins on the hub, 0.06 thick and 0.075 apart — the hub shows between them. */
export const FINS = { count: 5, r: 1.9, hub: 1.3, hole: 1.12, thick: 0.06, gap: 0.075, top: 0.3 } as const;

/** Fin `i`'s [top, bottom] in compute's frame; fin 0 faces the models above. */
export function finZ(i: number): readonly [number, number] {
  const top = FINS.top - i * (FINS.thick + FINS.gap);
  return [top, top - FINS.thick];
}

/** The heat sink as one lathe profile: up the hub, out and back along every fin, down the bore. */
function finProfile(): ProfilePoint[] {
  const { r, hub, hole, count } = FINS;
  const bottom = finZ(count - 1)[1];
  const pts: ProfilePoint[] = [{ r: hole, z: bottom, mat: MAT.body }];
  for (let i = count - 1; i >= 0; i--) {
    const [top, low] = finZ(i);
    if (i < count - 1) pts.push({ r: hub, z: low, mat: MAT.body });
    else pts.push({ r: r, z: low, mat: MAT.edge });
    if (i < count - 1) pts.push({ r: r, z: low, mat: MAT.edge });
    pts.push({ r: r, z: top, mat: MAT.body });
    pts.push({ r: i === 0 ? hole : hub, z: top, mat: MAT.body });
  }
  pts.push({ r: hole, z: bottom });
  return pts;
}
export const FIN_PROFILE: readonly ProfilePoint[] = finProfile();

// ---- Module builders -----------------------------------------------------------

/**
 * Each module's extent in its own frame (face first): z range, the mating
 * faces its neighbours seat against, and its largest radius. The rig
 * (lib/landing/engine/rig.ts) frames and places modules from these without
 * building any geometry.
 */
export const EXTENTS = [
  { zMin: -0.3, zMax: 0.22, seatBack: -0.3, seatFront: 0.22, radius: 2.3 },
  { zMin: -0.3, zMax: 0.3, seatBack: -0.3, seatFront: 0.3, radius: 2.02 },
  { zMin: -0.5, zMax: 0.5, seatBack: -0.5, seatFront: 0.5, radius: 1.95 },
  { zMin: -0.3, zMax: 0.3, seatBack: -0.3, seatFront: 0.3, radius: 1.9 },
  { zMin: -1.25, zMax: 0.4, seatBack: -0.25, seatFront: 0.25, radius: 2.34 },
] as const;

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
  return { surface, edges: latheEdges(BEZEL, radial), ...EXTENTS[0] };
}

export function interfaceModule(lod: Lod): ModuleGeometry {
  const { radial } = LOD[lod];
  const surface = merge([lathe(INTERFACE, radial, { rotor: ROTOR.interface }), ring(1.76, 1.8, 0.301, radial, HUE.product)]);
  return { surface, edges: latheEdges(INTERFACE, radial), ...EXTENTS[1] };
}

export function modelsModule(lod: Lod): ModuleGeometry {
  const { radial, core } = LOD[lod];
  const parts: Mesh[] = [lathe(HOUSING, radial, {}), ring(1.4, 1.44, 0.501, radial, HUE.ai)];
  // Twelve vent slots recessed into the outer wall.
  for (let i = 0; i < 12; i++) {
    parts.push(place(box([1.705, 0, 0], [0.012, 0.22, 0.62], { material: MAT.vent }), 90 - (i * 360) / 12 - 15, [0, 0, 0]));
  }
  // Ten blades around the wall, like cards in a cage, each with a violet status light on its edge.
  for (let i = 0; i < 10; i++) {
    const a = (i * 360) / 10;
    parts.push(place(box([0, 1.82, 0], [0.05, 0.24, 0.68], { material: MAT.body }), a, [0, 0, 0]));
    parts.push(place(box([0, 1.942, 0.12], [0.02, 0.006, 0.3], { material: MAT.inlay, hue: HUE.ai }), a, [0, 0, 0]));
  }
  // The core: a faceted glowing heart.
  parts.push(icosphere(0.52, core, { material: MAT.core, hue: HUE.ai, rotor: ROTOR.core }));
  const cage = icosphereEdges(0.7, 1);
  return {
    surface: merge(parts),
    edges: [...latheEdges(HOUSING, radial), ...cage],
    ...EXTENTS[2],
  };
}

export function computeModule(lod: Lod): ModuleGeometry {
  const { radial } = LOD[lod];
  // Compute is the design discipline's module (one colour map: coral).
  const parts: Mesh[] = [lathe(FIN_PROFILE, radial, {}), ring(1.18, 1.21, FINS.top + 0.001, radial, HUE.design)];
  // Twelve chips on the top fin, each with a lit package edge.
  for (let i = 0; i < 12; i++) {
    const a = (i * 360) / 12 + 15;
    parts.push(place(box([0, 1.5, FINS.top + 0.02], [0.2, 0.2, 0.04], { material: MAT.dial }), a, [0, 0, 0]));
    parts.push(place(box([0, 1.5, FINS.top + 0.041], [0.12, 0.012, 0.004], { material: MAT.inlay, hue: HUE.design }), a, [0, 0, 0]));
  }
  return {
    surface: merge(parts),
    edges: latheEdges(FIN_PROFILE, radial, 60),
    ...EXTENTS[3],
  };
}

export function dataModule(lod: Lod): ModuleGeometry {
  const { radial } = LOD[lod];
  // Data is architecture's module (one colour map: amber).
  const parts: Mesh[] = [lathe(FLANGE, radial, {}), lathe(REAR_HUB, radial, {}), ring(1.8, 1.84, 0.251, radial, HUE.arch)];
  // Twelve drive bays on the flange, each with an amber status light.
  for (let i = 0; i < 12; i++) {
    const a = (i * 360) / 12 + 15;
    parts.push(place(box([0, 2.02, 0.262], [0.34, 0.14, 0.024], { material: MAT.vent }), a, [0, 0, 0]));
    parts.push(place(box([0, 2.07, 0.276], [0.04, 0.03, 0.006], { material: MAT.inlay, hue: HUE.arch }), a, [0, 0, 0]));
  }
  // Cooling fins on the rear hub.
  for (let i = 0; i < 5; i++) {
    const z = -0.42 - i * 0.15;
    parts.push(lathe([{ r: 0.62, z: z - 0.015 }, { r: 0.8, z: z - 0.015 }, { r: 0.8, z: z + 0.015 }, { r: 0.62, z: z + 0.015 }], radial, { material: MAT.body }));
  }
  return {
    surface: merge(parts),
    edges: [...latheEdges(FLANGE, radial), ...latheEdges(REAR_HUB, radial)],
    ...EXTENTS[4],
  };
}

/** The central shaft: runs through every module; a spectrum light-pipe (Delivery). */
export function shaft(z0: number, z1: number): Mesh {
  return cylinder(0.16, z0, z1, 24, { material: MAT.inlay, hue: SPECTRUM_HUE });
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
