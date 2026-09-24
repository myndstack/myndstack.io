/**
 * The engine's face: the Core, built from the same numbers as the SVG ring
 * (lib/motion/core-geometry.ts), so the WebGL face lands on the SVG poster's
 * pixels. Flat glyphs in the dial plane, drawn unlit by the glow shader.
 *
 * Glyph meshes reuse the Mesh extras slots as [kind, hue, draw, v]:
 * `draw` is the draw-on parameter along the glyph (or the bar index for the
 * waveform), `v` the position across a ribbon (-1 → 1) for halo falloff.
 */
import { CORE } from "@/lib/motion/core-geometry";

import { emptyMesh, quad, vertex, type Mesh } from "./mesh";

/** World units per CORE unit: the CORE box (radius 500) is 2.1 world units across its radius. */
export const S = 2.1 / 500;

export const GLYPH = {
  tickMinor: 0,
  tickMajor: 1,
  arc: 2,
  inner: 3,
  cross: 4,
  playhead: 5,
  dot: 6,
  wave: 7,
  halo: 8,
} as const;

export const WAVE_BARS = 41;
/** Waveform bar pitch and width, CORE units (the SVG poster uses 11 / ~4.5). */
const WAVE_PITCH = 11;
const WAVE_WIDTH = 4.5;

const DEG = Math.PI / 180;
/** CORE angle (degrees clockwise from 12) → face-plane point. */
const at = (r: number, deg: number): [number, number] => [r * S * Math.sin(deg * DEG), r * S * Math.cos(deg * DEG)];

type Glyph = { kind: number; hue?: number; v?: number };

function glyphVertex(mesh: Mesh, x: number, y: number, z: number, g: Glyph, draw: number): number {
  return vertex(mesh, [x, y, z], [0, 0, 1], { material: g.kind, hue: g.hue ?? -1, draw, rotor: g.v ?? 0 });
}

/** A radial bar from r0 to r1 at `deg`, `width` CORE units wide. */
function radial(mesh: Mesh, r0: number, r1: number, deg: number, width: number, z: number, g: Glyph, draw: number) {
  const [x0, y0] = at(r0, deg);
  const [x1, y1] = at(r1, deg);
  // Perpendicular (in the plane), half width.
  const px = Math.cos(deg * DEG) * (width / 2) * S;
  const py = -Math.sin(deg * DEG) * (width / 2) * S;
  const a = glyphVertex(mesh, x0 - px, y0 - py, z, g, draw);
  const b = glyphVertex(mesh, x0 + px, y0 + py, z, g, draw);
  const c = glyphVertex(mesh, x1 + px, y1 + py, z, g, draw);
  const d = glyphVertex(mesh, x1 - px, y1 - py, z, g, draw);
  quad(mesh, a, b, c, d);
}

/** A ribbon along a circle from a0 to a1 (clockwise degrees), draw 0 → 1 along it, v -1 → 1 across. */
function ribbon(mesh: Mesh, r: number, width: number, a0: number, a1: number, steps: number, z: number, g: Glyph) {
  const inner: number[] = [];
  const outer: number[] = [];
  for (let s = 0; s <= steps; s++) {
    const deg = a0 + ((a1 - a0) * s) / steps;
    const draw = s / steps;
    const [xi, yi] = at(r - width / 2, deg);
    const [xo, yo] = at(r + width / 2, deg);
    inner.push(glyphVertex(mesh, xi, yi, z, { ...g, v: -1 }, draw));
    outer.push(glyphVertex(mesh, xo, yo, z, { ...g, v: 1 }, draw));
  }
  // Counter-clockwise seen from the front (+z): inner → next inner → next outer → outer.
  for (let s = 0; s < steps; s++) quad(mesh, inner[s], inner[s + 1], outer[s + 1], outer[s]);
}

export type FaceGlyphs = {
  /** Ticks, arcs, inner circle, crosses, dot, waveform — the dial. */
  readonly dial: Mesh;
  /** The playhead (spins by its own uniform). */
  readonly playhead: Mesh;
  /** Soft glow ribbons under the arcs (additive; high/medium tiers). */
  readonly halos: Mesh;
};

/**
 * @param z height of the glyph plane in the face module's local frame.
 * @param arcSteps segments per arc (LOD).
 */
export function faceGlyphs(z: number, arcSteps: number): FaceGlyphs {
  const dial = emptyMesh();
  // 180 ticks: every 15th is a longer major. Draw-on sweeps clockwise from 12.
  for (let i = 0; i < 180; i++) {
    const major = i % 15 === 0;
    radial(
      dial,
      major ? CORE.rTickMajorIn : CORE.rTickIn,
      CORE.rTickOut,
      i * 2,
      major ? 2.6 : 1.6,
      z,
      { kind: major ? 1 : 0 },
      i / 180,
    );
  }
  // The five arcs, each drawing on along its own length.
  CORE.arcs.forEach((arc, k) => ribbon(dial, CORE.rArc, 7, arc.a0, arc.a1, arcSteps, z + 0.001, { kind: 2, hue: k }));
  // Inner guide circle (the shader dashes it along `draw`).
  ribbon(dial, CORE.rInner, 1.6, 0, 360, arcSteps * 2, z, { kind: 3 });
  // Cross marks at 12, 3, 6 and 9 (the SVG's 188–238 box units from centre: r 262–312).
  for (const deg of [0, 90, 180, 270]) radial(dial, 262, 312, deg, 1.6, z, { kind: 4 }, 0);
  // Centre dot.
  ribbon(dial, 2.5, 5, 0, 360, 24, z, { kind: 6 });
  // Waveform: unit-height bars centred on the axis; the shader sets each height.
  for (let i = 0; i < WAVE_BARS; i++) {
    const x = (i - (WAVE_BARS - 1) / 2) * WAVE_PITCH * S;
    const hw = (WAVE_WIDTH / 2) * S;
    const draw = i / (WAVE_BARS - 1);
    const g = { kind: GLYPH.wave };
    const a = glyphVertex(dial, x - hw, -0.5, z + 0.002, g, draw);
    const b = glyphVertex(dial, x + hw, -0.5, z + 0.002, g, draw);
    const c = glyphVertex(dial, x + hw, 0.5, z + 0.002, g, draw);
    const d = glyphVertex(dial, x - hw, 0.5, z + 0.002, g, draw);
    quad(dial, a, b, c, d);
  }

  // Playhead: a triangle outside the ticks (SVG: tip at 32, base at 16 → r 468 / 484) and a hairline.
  const playhead = emptyMesh();
  const [tx, ty] = at(468, 0);
  const [bx0, by0] = at(484, -1.1);
  const [bx1, by1] = at(484, 1.1);
  const p = { kind: GLYPH.playhead };
  const t0 = glyphVertex(playhead, tx, ty, z + 0.003, p, 0);
  const t1 = glyphVertex(playhead, bx1, by1, z + 0.003, p, 0);
  const t2 = glyphVertex(playhead, bx0, by0, z + 0.003, p, 0);
  playhead.indices.push(t0, t1, t2);
  radial(playhead, 430, 460, 0, 1.6, z + 0.003, p, 0);

  // Halos: wide ribbons under each arc (Gaussian falloff across `v` in the shader).
  const halos = emptyMesh();
  CORE.arcs.forEach((arc, k) => ribbon(halos, CORE.rArc, 46, arc.a0 + 1.5, arc.a1 - 1.5, arcSteps, z - 0.002, { kind: 8, hue: k }));

  return { dial, playhead, halos };
}

