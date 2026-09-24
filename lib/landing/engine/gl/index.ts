/**
 * The landing engine's renderer — the only chunk that carries three.js,
 * loaded lazily by the live director. Passive: every frame it is handed the
 * pose, the camera (lib/landing/engine/camera.ts, shared with the DOM
 * overlays) and the fronts, and draws; it keeps no timeline of its own.
 *
 * Passes (shaders.ts): the G-buffer (machined colour + normal/part id), the
 * composite (machined or ink per pixel, split exactly where the page's scan
 * line or develop circle is), then, on ink, dashed hidden lines.
 */
import { SPECTRUM, SPECTRUM_DEEP } from "@/lib/motion/tokens";

import { projectCircle, type Camera as View } from "../camera";
import { buildEngine, moduleZ, pack, type Lod, type Mesh as GeoMesh } from "../geometry/index";
import { R_BORE, rig } from "../rig";
import { SKIN, rgba } from "../skins";
import { CH, type Pose } from "../types";
import {
  COMPOSITE_FS,
  GLYPH_FS,
  GLYPH_VS,
  HIDDEN_FS,
  HIDDEN_VS,
  QUAD_VS,
  SURFACE_FS,
  SURFACE_VS,
} from "./shaders";
import {
  BufferAttribute,
  BufferGeometry,
  Camera,
  DepthTexture,
  DoubleSide,
  FrontSide,
  LineSegments,
  Mesh,
  NearestFilter,
  RawShaderMaterial,
  Scene,
  UnsignedByteType,
  UnsignedIntType,
  WebGLRenderTarget,
  WebGLRenderer,
} from "./three";

// Budget marker: scripts/bundle-budget.mjs --engine finds the engine chunk by
// this string, and e2e tests assert the module never evaluates in poster mode.
performance.mark("engine:module-eval");

/** The machined/ink split, CSS px: a scan's line (y from the top) or a develop's circle. */
export type Split =
  | { readonly mode: 0 }
  | { readonly mode: 1; readonly y: number }
  | { readonly mode: 2; readonly cx: number; readonly cy: number; readonly r: number };

export type Frame = {
  readonly pose: Pose;
  readonly camera: View;
  /** Seconds, for the idle loops and the waveform. */
  readonly time: number;
  readonly split: Split;
  /** Ink amount above/inside the split, and below/outside it (0 machined, 1 ink). */
  readonly ink: readonly [number, number];
  /** The halo's and rim light's colour: the current accent, 0–1 sRGB. */
  readonly accent: readonly [number, number, number];
  /** Idle rotor angles, radians (bezel knurl, interface, gear, core). */
  readonly idle: { readonly bezel: number; readonly iface: number; readonly gear: number; readonly core: number };
};

export type EngineOptions = {
  readonly lod: Lod;
  readonly hiddenLines: boolean;
  /** Render scale never exceeds this, nor pushes the canvas past `maxPixels`. */
  readonly scaleCap: number;
  readonly maxPixels: number;
};

export type EngineStats = {
  readonly frames: number;
  readonly calls: number;
  readonly triangles: number;
  readonly lost: boolean;
  readonly scale: number;
};

export type EngineHandle = {
  readonly resize: (cssW: number, cssH: number, dpr: number) => void;
  readonly render: (frame: Frame) => void;
  readonly stats: () => EngineStats;
  readonly dispose: () => void;
};

const DEG = Math.PI / 180;
const HUES = ["lime", "ai", "product", "design", "arch"] as const;
const srgb = (hex: string) => rgba(hex).slice(0, 3);
const linear = (hex: string) => srgb(hex).map((c) => c ** 2.2);
const flat = (rows: readonly (readonly number[])[]) => Float32Array.from(rows.flat());

function geometry(m: GeoMesh): BufferGeometry {
  const p = pack(m);
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(p.position, 3));
  g.setAttribute("normal", new BufferAttribute(p.normal, 3));
  g.setAttribute("extra", new BufferAttribute(p.extra, 4));
  g.setIndex(new BufferAttribute(p.index, 1));
  return g;
}

function lines(segments: readonly number[]): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(Float32Array.from(segments), 3));
  return g;
}

export function createEngine(canvas: HTMLCanvasElement, opts: EngineOptions): EngineHandle | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 0);

  const target = new WebGLRenderTarget(1, 1, {
    count: 2,
    type: UnsignedByteType,
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    depthBuffer: true,
  });
  target.depthTexture = new DepthTexture(1, 1, UnsignedIntType);

  // Shared uniform values: one write per frame reaches every program.
  const view = { value: new Float32Array(16) };
  const proj = { value: new Float32Array(16) };
  const time = { value: 0 };
  const hues = { value: flat(HUES.map((h) => linear(SPECTRUM[h]))) };
  const rotor = { value: new Float32Array(7) };
  // The chamber: a circular hole through the whole engine (canvas px, y from the bottom).
  const bore = { value: new Float32Array(3) };
  const res = { value: new Float32Array(2) };
  const split = { value: new Float32Array(4) };
  const ink = { value: new Float32Array(2) };
  const inkC = { value: Float32Array.from(srgb(SKIN.drafting.text1)) };
  const rimC = { value: new Float32Array(3) };
  const rim = { value: 1 };
  const core = { value: 0.25 };
  const pipe = { value: 1 };
  const tDepth = { value: target.depthTexture };
  const raw = (vs: string, fs: string, uniforms: Record<string, { value: unknown }>) =>
    new RawShaderMaterial({ glslVersion: "300 es", vertexShader: vs, fragmentShader: fs, uniforms });

  const engine = buildEngine(opts.lod);
  const sceneG = new Scene();
  const sceneH = new Scene();
  const surfaces: { mesh: Mesh; model: { value: Float32Array }; id: { value: number }; cut: { value: number }; at: { value: number } }[] = [];
  const hidden: { model: { value: Float32Array } }[] = [];
  const add = (scene: Scene, obj: Mesh | LineSegments) => {
    obj.frustumCulled = false;
    scene.add(obj);
  };

  const surfaceMaterial = (id: number) => {
    const u = {
      uProj: proj,
      uView: view,
      uModel: { value: new Float32Array(16) },
      uRotor: rotor,
      uHue: hues,
      uId: { value: id },
      uCut: { value: 0 },
      uCutAt: { value: 0 },
      uCore: core,
      uPipe: pipe,
      uBore: bore,
      uTime: time,
      uRimC: rimC,
      uRim: rim,
      // The shaft is built long enough for the exploded engine; assembled, it must stop inside it.
      uClampZ: { value: new Float32Array([-1e9, 1e9]) },
    };
    return { material: raw(SURFACE_VS, SURFACE_FS, u), u };
  };

  engine.modules.forEach((m, k) => {
    const { material, u } = surfaceMaterial(k);
    const mesh = new Mesh(geometry(m.surface), material);
    add(sceneG, mesh);
    surfaces.push({ mesh, model: u.uModel, id: u.uId, cut: u.uCut, at: u.uCutAt });
    if (opts.hiddenLines && m.edges.length) {
      const hu = { uProj: proj, uView: view, uModel: u.uModel, tZ: tDepth, uRes: res, uInkC: inkC, uAlpha: { value: 0.28 }, uSplit: split, uInk: ink };
      add(sceneH, new LineSegments(lines(m.edges), raw(HIDDEN_VS, HIDDEN_FS, hu)));
      hidden.push({ model: u.uModel });
    }
  });
  // The shaft runs through every module: the engine's own frame (tilt only).
  const shaft = surfaceMaterial(5);
  add(sceneG, new Mesh(geometry(engine.shaft), shaft.material));

  // The face's glyphs ride the face module; the dial turns by its detent, the playhead by its own angle.
  const glyphU = (spin: { value: number }) => ({
    uProj: proj,
    uView: view,
    uModel: surfaces[0].model,
    uSpin: spin,
    uWave: { value: 1 },
    uTime: time,
    uHue: hues,
    uArcs: { value: new Float32Array(5) },
    uDraw: { value: 1 },
    uPower: { value: 1 },
    uBore: bore,
  });
  const dialU = glyphU({ value: 0 });
  const headU = { ...glyphU({ value: 0 }), uArcs: dialU.uArcs, uDraw: dialU.uDraw, uPower: dialU.uPower, uWave: dialU.uWave };
  add(sceneG, new Mesh(geometry(engine.glyphs.dial), raw(GLYPH_VS, GLYPH_FS, dialU)));
  add(sceneG, new Mesh(geometry(engine.glyphs.playhead), raw(GLYPH_VS, GLYPH_FS, headU)));

  // The composite: one triangle over the whole canvas.
  const quad = new BufferGeometry();
  quad.setAttribute("position", new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const ghost = { value: new Float32Array(6) };
  const halo = { value: new Float32Array(4) };
  const haloC = { value: new Float32Array(3) };
  const glass = { value: new Float32Array(4) };
  const nf = { value: new Float32Array(2) };
  const px = { value: 1 };
  const sceneC = new Scene();
  add(
    sceneC,
    new Mesh(
      quad,
      raw(QUAD_VS, COMPOSITE_FS, {
        tC: { value: target.textures[0] },
        tD: { value: target.textures[1] },
        tZ: tDepth,
        uRes: res,
        uPx: px,
        uSplit: split,
        uInk: ink,
        uPaper: { value: flat([SKIN.drafting.raised, SKIN.drafting.base, "#c7c5be"].map(srgb)) },
        uInkC: inkC,
        uDeep: { value: flat(HUES.map((h) => srgb(SPECTRUM_DEEP[h]))) },
        uHalo: halo,
        uHaloC: haloC,
        uGlass: glass,
        uGhost: ghost,
        uNF: nf,
      }),
    ),
  );

  const dummy = new Camera();
  let frames = 0;
  let lost = false;
  let scale = 1;
  let cssW = 1;
  let cssH = 1;
  const models = new Float32Array(80);
  const onLost = (e: Event) => {
    e.preventDefault();
    lost = true;
  };
  const onRestored = () => {
    lost = false;
  };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);

  const render = (f: Frame) => {
    if (lost) return;
    const pose = f.pose;
    const cam = f.camera;
    const r = rig(pose, models);
    view.value.set(cam.view);
    proj.value.set(cam.proj);
    time.value = f.time;
    const power = pose[CH.power];
    rotor.value[1] = f.idle.bezel;
    rotor.value[2] = f.idle.iface;
    rotor.value[3] = f.idle.gear;
    rotor.value[6] = f.idle.core;
    core.value = pose[CH.core] * power;
    pipe.value = 0.35 + 0.65 * power;
    rim.value = pose[CH.rim];
    // The rim is the halo's light washed toward white: a lit edge, not a coloured part.
    rimC.value.set(f.accent.map((c) => (0.82 + (c - 0.82) * 0.35) ** 2.2));

    // Ink: the skin's, or forced (the tools' schematic); process 01 sketches in lime-deep.
    const forced = pose[CH.lineArt];
    ink.value[0] = Math.max(f.ink[0], forced);
    ink.value[1] = Math.max(f.ink[1], forced);
    const sketch = pose[CH.sketch];
    const inkRgb = srgb(SKIN.drafting.text1);
    const limeDeep = srgb(SPECTRUM_DEEP.lime);
    for (let i = 0; i < 3; i++) inkC.value[i] = inkRgb[i] + (limeDeep[i] - inkRgb[i]) * sketch;

    const lifted = [0, 1, 2, 3, 4].map((k) => pose[CH.lift + k]);
    surfaces.forEach((s, k) => {
      s.model.value.set(models.subarray(k * 16, k * 16 + 16));
      const cut = lifted[k] > 0.5 ? pose[CH.cutaway] * (Math.PI / 4) : 0;
      s.cut.value = cut;
      (s.mesh.material as RawShaderMaterial).side = cut > 0 ? DoubleSide : FrontSide;
      if (cut > 0) {
        // The wedge faces the camera: its direction in the module's own frame.
        const m = k * 16;
        const ex = cam.eye[0] - models[m + 12];
        const ey = cam.eye[1] - models[m + 13];
        const ez = cam.eye[2] - models[m + 14];
        s.at.value = Math.atan2(models[m + 4] * ex + models[m + 5] * ey + models[m + 6] * ez, models[m] * ex + models[m + 1] * ey + models[m + 2] * ez);
      }
      ghost.value[k] = pose[CH.ghost] * (1 - lifted[k]);
    });
    ghost.value[5] = pose[CH.ghost];
    const t = pose[CH.tilt] * DEG;
    shaft.u.uModel.value.set([1, 0, 0, 0, 0, Math.cos(t), -Math.sin(t), 0, 0, Math.sin(t), Math.cos(t), 0, 0, 0, 0, 1]);
    shaft.u.uClampZ.value[0] = moduleZ(4, pose[CH.explode]) - 1.05;
    shaft.u.uClampZ.value[1] = moduleZ(0, pose[CH.explode]) - 0.32;


    dialU.uSpin.value = -pose[CH.dial] * DEG;
    headU.uSpin.value = -(pose[CH.playhead] + pose[CH.spin] * 360 * f.time) * DEG;
    for (let k = 0; k < 5; k++) dialU.uArcs.value[k] = pose[CH.arc + k];
    dialU.uDraw.value = pose[CH.draw];
    dialU.uPower.value = power;
    dialU.uWave.value = pose[CH.wave] * power;

    // Composite uniforms, in render-target px (y from the top).
    const s = scale;
    res.value[0] = Math.floor(cssW * s);
    res.value[1] = Math.floor(cssH * s);
    px.value = s;
    const sp = f.split;
    if (sp.mode === 1) split.value.set([1, sp.y * s, 0, 0]);
    else if (sp.mode === 2) split.value.set([2, sp.cx * s, sp.cy * s, sp.r * s]);
    else split.value.set([0, 0, 0, 0]);
    nf.value[0] = cam.near;
    nf.value[1] = cam.far;
    const portal = pose[CH.portal];
    const b = portal > 0.001 ? projectCircle(cam, r.face, r.axis, R_BORE * portal) : null;
    if (b) bore.value.set([b.cx * s, res.value[1] - b.cy * s, ((b.rx + b.ry) / 2) * s]);
    else bore.value[2] = 0;
    const face = projectCircle(cam, r.face, r.axis, 1.98);
    if (face) glass.value.set([face.cx * s, face.cy * s, ((face.rx + face.ry) / 2) * s, pose[CH.glass]]);
    else glass.value[3] = 0;
    halo.value.set([(cam.target.cx - cam.target.r * 0.1) * s, (cam.target.cy - cam.target.r * 0.12) * s, cam.target.r * 1.35 * s, pose[CH.haze] * 0.16]);
    // The brighter the hue, the paler its halo: lime at full strength turns the dark olive.
    const lum = 0.2126 * f.accent[0] + 0.7152 * f.accent[1] + 0.0722 * f.accent[2];
    const pale = Math.min(0.6, Math.max(0, (lum - 0.5) * 1.5));
    haloC.value.set(f.accent.map((c) => c + (lum - c) * pale));

    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(sceneG, dummy);
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(sceneC, dummy);
    if (hidden.length && (ink.value[0] > 0 || ink.value[1] > 0)) renderer.render(sceneH, dummy);
    frames += 1;
  };

  return {
    resize: (w, h, dpr) => {
      cssW = Math.max(1, w);
      cssH = Math.max(1, h);
      scale = Math.max(1, Math.min(opts.scaleCap, Math.max(dpr, 1.5), Math.sqrt(opts.maxPixels / (cssW * cssH))));
      renderer.setPixelRatio(scale);
      renderer.setSize(cssW, cssH, false);
      // three floors the drawing buffer; the G-buffer must match it pixel for pixel.
      target.setSize(Math.floor(cssW * scale), Math.floor(cssH * scale));
    },
    render,
    stats: () => ({
      frames,
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      lost: lost || renderer.getContext().isContextLost(),
      scale,
    }),
    dispose: () => {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      for (const scene of [sceneG, sceneH, sceneC]) {
        scene.traverse((o) => {
          if (o instanceof Mesh || o instanceof LineSegments) {
            o.geometry.dispose();
            (o.material as RawShaderMaterial).dispose();
          }
        });
      }
      target.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
