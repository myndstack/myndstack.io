/**
 * The whole engine's geometry at a level of detail: five modules (face →
 * data), the face's glyphs, and the shaft. Pure data for the renderer (and for
 * the SVG posters, which draw the same profiles); unit-tested for CORE parity,
 * winding, bounds and triangle budgets.
 */
import { faceGlyphs, type FaceGlyphs } from "./face";
import { cylinder, triangleCount, MAT, SPECTRUM_HUE, type Mesh } from "./mesh";
import {
  EXPLODE_GAP,
  LOD,
  MODULE_Z,
  computeModule,
  dataModule,
  faceModule,
  interfaceModule,
  moduleZ,
  modelsModule,
  type Lod,
  type ModuleGeometry,
} from "./parts";

export { GLYPH, S, WAVE_BARS } from "./face";
export { MAT, ROTOR, SPECTRUM_HUE, NO_HUE, pack, type Mesh, type Packed } from "./mesh";
export { EXPLODE_GAP, EXTENTS, LOD, MODULE_Z, moduleExplode, moduleZ, type Lod, type ModuleGeometry } from "./parts";
export { BEZEL, FINS, FLANGE, HOUSING, HUB, INTERFACE, REAR_HUB, finZ } from "./parts";

/** Glyph plane height in the face module's frame: just above the dial, under the glass. */
export const GLYPH_Z = 0.012;

export type EngineGeometry = {
  readonly lod: Lod;
  /** Face, interface, models, compute, data — each in its own local frame (add moduleZ). */
  readonly modules: readonly ModuleGeometry[];
  readonly glyphs: FaceGlyphs;
  /** The shaft through every module, in the engine's frame. */
  readonly shaft: Mesh;
};

export function buildEngine(lod: Lod): EngineGeometry {
  const modules = [faceModule(lod), interfaceModule(lod), modelsModule(lod), computeModule(lod), dataModule(lod)];
  const arcSteps = lod === 0 ? 64 : lod === 1 ? 48 : 28;
  // The shaft spans the fully exploded engine, so it's visible between every module.
  const back = MODULE_Z[4] + EXPLODE_GAP[4] + modules[4].zMin;
  const front = MODULE_Z[1] + EXPLODE_GAP[1] + modules[1].zMax;
  return {
    lod,
    modules,
    glyphs: faceGlyphs(GLYPH_Z, arcSteps),
    shaft: cylinder(0.16, back, front, LOD[lod].piston + 8, { material: MAT.inlay, hue: SPECTRUM_HUE }),
  };
}

/** Draw calls the renderer issues for surfaces and glyphs (lines add at most two more). */
export function drawCalls(engine: EngineGeometry): number {
  return engine.modules.length + 3 /* dial, playhead, halos */ + 1 /* shaft */;
}

export function totalTriangles(engine: EngineGeometry): number {
  return (
    engine.modules.reduce((n, m) => n + triangleCount(m.surface), 0) +
    triangleCount(engine.glyphs.dial) +
    triangleCount(engine.glyphs.playhead) +
    triangleCount(engine.glyphs.halos) +
    triangleCount(engine.shaft)
  );
}

/**
 * Bounding sphere of the whole engine at explode `e` (in the engine's frame:
 * centre on the axis). The sphere fit frames this.
 */
export function engineBounds(engine: EngineGeometry, e: number): { readonly z: number; readonly radius: number } {
  let zMin = Infinity;
  let zMax = -Infinity;
  let r = 0;
  engine.modules.forEach((m, k) => {
    const z = moduleZ(k, e);
    zMin = Math.min(zMin, z + m.zMin);
    zMax = Math.max(zMax, z + m.zMax);
    r = Math.max(r, m.radius);
  });
  const half = (zMax - zMin) / 2;
  return { z: (zMin + zMax) / 2, radius: Math.hypot(half, r) };
}

/** Bounding sphere of one module at explode `e` (stations frame the focused module). */
export function moduleBounds(engine: EngineGeometry, module: number, e: number): { readonly z: number; readonly radius: number } {
  const m = engine.modules[module];
  const z = moduleZ(module, e);
  const half = (m.zMax - m.zMin) / 2;
  return { z: z + (m.zMin + m.zMax) / 2, radius: Math.hypot(half, m.radius) };
}
