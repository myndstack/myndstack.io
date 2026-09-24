/**
 * Mesh builders for the engine's procedural geometry. Pure (no three.js): the
 * renderer turns packed arrays into BufferGeometry. Every vertex carries four
 * extras the shaders read — material, hue, draw-on parameter, rotor — so a
 * whole module merges into one draw call and still spins, lights and draws on
 * per part.
 *
 * Axis convention: the engine's axis is local +z (the face points +z); angles
 * on the face are degrees clockwise from 12 o'clock, as in core-geometry.
 */

/** Surface materials (shader switch). */
export const MAT = {
  body: 0,
  edge: 1,
  fastener: 2,
  dial: 3,
  glass: 4,
  inlay: 5,
  knurl: 6,
  engrave: 7,
  vent: 8,
  core: 9,
} as const;

/** Parts that spin about the axis (uniform per rotor). */
export const ROTOR = { none: 0, bezel: 1, interface: 2, gear: 3, ticks: 4, playhead: 5, core: 6 } as const;

/** No hue / the spectrum (the shaft light-pipe). Hues 0–4 are the ARCS order. */
export const NO_HUE = -1;
export const SPECTRUM_HUE = 5;

export type Extras = {
  readonly material: number;
  readonly hue?: number;
  /** Draw-on parameter along the part, 0 → 1, or -1 for always drawn. */
  readonly draw?: number;
  readonly rotor?: number;
};

export type Mesh = {
  readonly positions: number[];
  readonly normals: number[];
  /** 4 per vertex: material, hue, draw, rotor. */
  readonly extras: number[];
  readonly indices: number[];
};

export type Packed = {
  readonly position: Float32Array;
  readonly normal: Float32Array;
  readonly extra: Float32Array;
  readonly index: Uint32Array;
  readonly triangles: number;
};

export type Vec3 = readonly [number, number, number];

export const emptyMesh = (): Mesh => ({ positions: [], normals: [], extras: [], indices: [] });

export function vertex(mesh: Mesh, p: Vec3, n: Vec3, e: Extras): number {
  const index = mesh.positions.length / 3;
  mesh.positions.push(p[0], p[1], p[2]);
  mesh.normals.push(n[0], n[1], n[2]);
  mesh.extras.push(e.material, e.hue ?? NO_HUE, e.draw ?? -1, e.rotor ?? ROTOR.none);
  return index;
}

export function quad(mesh: Mesh, a: number, b: number, c: number, d: number): void {
  mesh.indices.push(a, b, c, a, c, d);
}

/**
 * A quad wound to face its vertices' stored normal (counter-clockwise seen
 * from the side the normal points to) — whatever order the corners come in.
 */
export function quadFacing(mesh: Mesh, a: number, b: number, c: number, d: number): void {
  const p = mesh.positions;
  const ux = p[b * 3] - p[a * 3];
  const uy = p[b * 3 + 1] - p[a * 3 + 1];
  const uz = p[b * 3 + 2] - p[a * 3 + 2];
  const vx = p[c * 3] - p[a * 3];
  const vy = p[c * 3 + 1] - p[a * 3 + 1];
  const vz = p[c * 3 + 2] - p[a * 3 + 2];
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  const n = mesh.normals;
  const facing = nx * n[a * 3] + ny * n[a * 3 + 1] + nz * n[a * 3 + 2];
  if (facing >= 0) quad(mesh, a, b, c, d);
  else quad(mesh, a, d, c, b);
}

export function merge(meshes: readonly Mesh[]): Mesh {
  const out = emptyMesh();
  for (const m of meshes) {
    const base = out.positions.length / 3;
    out.positions.push(...m.positions);
    out.normals.push(...m.normals);
    out.extras.push(...m.extras);
    for (const i of m.indices) out.indices.push(i + base);
  }
  return out;
}

export function pack(mesh: Mesh): Packed {
  return {
    position: Float32Array.from(mesh.positions),
    normal: Float32Array.from(mesh.normals),
    extra: Float32Array.from(mesh.extras),
    index: Uint32Array.from(mesh.indices),
    triangles: mesh.indices.length / 3,
  };
}

/** Moves a mesh (positions + normals) by a rotation about z then a translation. */
export function place(mesh: Mesh, rotZDeg: number, offset: Vec3): Mesh {
  const a = (rotZDeg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const positions: number[] = [];
  const normals: number[] = [];
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const x = mesh.positions[i];
    const y = mesh.positions[i + 1];
    positions.push(x * c - y * s + offset[0], x * s + y * c + offset[1], mesh.positions[i + 2] + offset[2]);
    const nx = mesh.normals[i];
    const ny = mesh.normals[i + 1];
    normals.push(nx * c - ny * s, nx * s + ny * c, mesh.normals[i + 2]);
  }
  return { positions, normals, extras: [...mesh.extras], indices: [...mesh.indices] };
}

/** Places a part on a circle: moved out to `radius` along +y (12 o'clock), then turned `deg` about the axis. */
export function orbit(mesh: Mesh, radius: number, deg: number): Mesh {
  return place(place(mesh, 0, [0, radius, 0]), deg, [0, 0, 0]);
}

/** A profile point for a lathe: radius and z, and the material of the segment that starts here. */
export type ProfilePoint = { readonly r: number; readonly z: number; readonly mat?: number };

/**
 * Sweeps a polyline profile (r, z) around the axis. Each segment is its own
 * band with its own normal (hard edges at every profile corner — machined, not
 * blobby), smooth around the axis. Profiles run counter-clockwise in the
 * (r, z) plane (r right, z up) — solid on the left — so normals point out and
 * triangles wind counter-clockwise seen from outside (three's front face).
 */
export function lathe(profile: readonly ProfilePoint[], segments: number, e: Omit<Extras, "material"> & { material?: number }): Mesh {
  const mesh = emptyMesh();
  for (let i = 0; i < profile.length - 1; i++) {
    const p0 = profile[i];
    const p1 = profile[i + 1];
    const dr = p1.r - p0.r;
    const dz = p1.z - p0.z;
    const len = Math.hypot(dr, dz);
    if (len === 0) continue;
    // Outward normal in the (r, z) plane: the direction rotated by -90°.
    const nr = dz / len;
    const nz = -dr / len;
    const material = p0.mat ?? e.material ?? MAT.body;
    const ring0: number[] = [];
    const ring1: number[] = [];
    for (let s = 0; s <= segments; s++) {
      const a = (s / segments) * Math.PI * 2;
      const sin = Math.sin(a);
      const cos = Math.cos(a);
      const n: Vec3 = [nr * sin, nr * cos, nz];
      ring0.push(vertex(mesh, [p0.r * sin, p0.r * cos, p0.z], n, { ...e, material }));
      ring1.push(vertex(mesh, [p1.r * sin, p1.r * cos, p1.z], n, { ...e, material }));
    }
    for (let s = 0; s < segments; s++) quad(mesh, ring0[s], ring1[s], ring1[s + 1], ring0[s + 1]);
  }
  return mesh;
}

/**
 * Feature edges of a lathed profile: a circle at every corner sharper than
 * `minDeg` (and at open ends) — the blueprint's ink lines. Returned as line
 * segment pairs (x, y, z, x, y, z, …).
 */
export function latheEdges(profile: readonly ProfilePoint[], segments: number, minDeg = 20): number[] {
  const out: number[] = [];
  const ring = (r: number, z: number) => {
    if (r <= 1e-6) return;
    for (let s = 0; s < segments; s++) {
      const a0 = (s / segments) * Math.PI * 2;
      const a1 = ((s + 1) / segments) * Math.PI * 2;
      out.push(r * Math.sin(a0), r * Math.cos(a0), z, r * Math.sin(a1), r * Math.cos(a1), z);
    }
  };
  for (let i = 0; i < profile.length; i++) {
    const p = profile[i];
    if (i === 0 || i === profile.length - 1) {
      ring(p.r, p.z);
      continue;
    }
    const a = profile[i - 1];
    const b = profile[i + 1];
    const v0 = [p.r - a.r, p.z - a.z];
    const v1 = [b.r - p.r, b.z - p.z];
    const l0 = Math.hypot(v0[0], v0[1]);
    const l1 = Math.hypot(v1[0], v1[1]);
    if (!l0 || !l1) continue;
    const cos = (v0[0] * v1[0] + v0[1] * v1[1]) / (l0 * l1);
    const turn = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
    if (turn >= minDeg) ring(p.r, p.z);
  }
  return out;
}

/** A flat annulus in the plane z, facing +z (or -z). */
export function annulus(rIn: number, rOut: number, z: number, segments: number, e: Extras, facing: 1 | -1 = 1): Mesh {
  return facing === 1
    ? lathe([{ r: rOut, z }, { r: rIn, z }], segments, e)
    : lathe([{ r: rIn, z }, { r: rOut, z }], segments, e);
}

/** A closed cylinder along z (for pistons, bolts, the shaft): side + caps, `sides` facets. */
export function cylinder(radius: number, z0: number, z1: number, sides: number, e: Extras): Mesh {
  return lathe(
    [
      { r: 0, z: z1 },
      { r: radius, z: z1 },
      { r: radius, z: z0 },
      { r: 0, z: z0 },
    ],
    sides,
    e,
  );
}

/** An axis-aligned box centred on (x, y, z), sizes (w, h, d), flat-shaded. */
export function box(center: Vec3, size: Vec3, e: Extras): Mesh {
  const mesh = emptyMesh();
  const [cx, cy, cz] = center;
  const [hx, hy, hz] = [size[0] / 2, size[1] / 2, size[2] / 2];
  const faces: [Vec3, Vec3, Vec3][] = [
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
    [[0, 1, 0], [0, 0, 1], [1, 0, 0]],
    [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
    [[0, 0, -1], [0, 1, 0], [1, 0, 0]],
  ];
  for (const [n, u, v] of faces) {
    const c: Vec3 = [cx + n[0] * hx, cy + n[1] * hy, cz + n[2] * hz];
    const du: Vec3 = [u[0] * hx, u[1] * hy, u[2] * hz];
    const dv: Vec3 = [v[0] * hx, v[1] * hy, v[2] * hz];
    const corner = (su: number, sv: number): Vec3 => [
      c[0] + du[0] * su + dv[0] * sv,
      c[1] + du[1] * su + dv[1] * sv,
      c[2] + du[2] * su + dv[2] * sv,
    ];
    const a = vertex(mesh, corner(-1, -1), n, e);
    const b = vertex(mesh, corner(1, -1), n, e);
    const d = vertex(mesh, corner(1, 1), n, e);
    const f = vertex(mesh, corner(-1, 1), n, e);
    quadFacing(mesh, a, b, d, f);
  }
  return mesh;
}

/** A geodesic sphere (icosahedron subdivided `detail` times), smooth normals. */
export function icosphere(radius: number, detail: number, e: Extras): Mesh {
  const t = (1 + Math.sqrt(5)) / 2;
  let verts: Vec3[] = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ];
  let faces: [number, number, number][] = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  const norm = (v: Vec3): Vec3 => {
    const l = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / l, v[1] / l, v[2] / l];
  };
  verts = verts.map(norm);
  for (let d = 0; d < detail; d++) {
    const cache = new Map<string, number>();
    const mid = (a: number, b: number) => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      const hit = cache.get(key);
      if (hit !== undefined) return hit;
      const va = verts[a];
      const vb = verts[b];
      verts.push(norm([(va[0] + vb[0]) / 2, (va[1] + vb[1]) / 2, (va[2] + vb[2]) / 2]));
      cache.set(key, verts.length - 1);
      return verts.length - 1;
    };
    const next: [number, number, number][] = [];
    for (const [a, b, c] of faces) {
      const ab = mid(a, b);
      const bc = mid(b, c);
      const ca = mid(c, a);
      next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = next;
  }
  const mesh = emptyMesh();
  const ids = verts.map((v) => vertex(mesh, [v[0] * radius, v[1] * radius, v[2] * radius], v, e));
  for (const [a, b, c] of faces) mesh.indices.push(ids[a], ids[b], ids[c]);
  return mesh;
}

export const triangleCount = (mesh: Mesh): number => mesh.indices.length / 3;
