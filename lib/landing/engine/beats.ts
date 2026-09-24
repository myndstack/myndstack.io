/**
 * The beat table: one pose per beat, in page order, and the designed page
 * (SCROLL_PLAN) the landing CSS implements. Pure data — choreography.ts places
 * these on the measured page and samples poses between them.
 *
 * Poses are authored as deltas: a beat lists only the channels it changes and
 * carries everything else over from the beat above (buildPoses), so a beat
 * dropped at runtime (a section that didn't render) never changes the ones
 * after it.
 */
import { ARCS, type Beat, type Bezier, type PoseSpec } from "./types";

/** Locks: ~2% overshoot as each module seats. */
export const LOCK: Bezier = [0.34, 1.4, 0.64, 1];

/** Mid-angle of each arc, clockwise from 12 (CORE: five 64° arcs with 8° gaps, lime centred on 12). */
export const ARC_MID = [0, 72, 144, 216, 288] as const;

/** Every channel's value above the first beat. */
export const BASE: Required<Omit<PoseSpec, "lift" | "arcs">> & { lift: number[]; arcs: number[] } = {
  yaw: 0,
  pitch: 0,
  tilt: 0,
  fov: 24,
  fill: 0.92,
  offX: 0,
  offY: 0,
  explode: 0,
  lift: [0, 0, 0, 0, 0],
  ghost: 0,
  dim: 0,
  arcs: [1, 1, 1, 1, 1],
  draw: 1,
  power: 1,
  playhead: 0,
  sketch: 0,
  lineArt: 0,
  align: 1,
  glass: 0.55,
  core: 0.25,
  wave: 1,
  ambient: 1,
  lean: 0,
  cutaway: 0,
  annot: 0,
  build: 1,
  haze: 0.6,
  aim: 2,
  focus: 0,
  spin: 0,
};

const onlyLift = (module: number) => [0, 1, 2, 3, 4].map((k) => (k === module ? 1 : 0));

/** Stations: the camera descends the tower, one module pulled out and cut away per stop. */
const station = (id: string, module: number, pitch: number): Beat => ({
  id,
  marker: id,
  hold: 32,
  host: "stage",
  fit: "sphere",
  box: "rail",
  pose: { aim: module, focus: 1, lift: onlyLift(module), ghost: 0.75, cutaway: 1, annot: 1, pitch, fill: 0.78 },
  dom: { labels: "annot" },
});

/** Capabilities: the porthole. Active arc full, past arcs 55%, upcoming 20%; the playhead points at it. */
const capability = (i: number): Beat => ({
  id: `cap-${i}`,
  marker: `cap-${i}`,
  hold: 32,
  host: "stage",
  fit: "circle",
  box: "ringTop",
  pose: {
    yaw: 0,
    pitch: 0,
    tilt: 0,
    explode: 0,
    fill: 1,
    glass: 0.85,
    core: 0.2,
    wave: 0,
    haze: 0.5,
    ambient: 1,
    lean: 1,
    arcs: ARCS.map((_, k) => (k === 0 || k - 1 < i ? 0.55 : k - 1 === i ? 1 : 0.2)),
    playhead: ARC_MID[i + 1],
  },
  dom: { cap: i, labels: null },
});

/** Process: the engine being built. Camera fixed on the tower; holds 10svh, travels 15. */
const build = (step: number, pose: PoseSpec, extra: Partial<Beat> = {}): Beat => ({
  id: `build-${step}`,
  marker: `build-${step}`,
  hold: 10,
  host: "stage",
  fit: "sphere",
  box: "rail",
  pose,
  ...extra,
});

export const BEATS: readonly Beat[] = [
  {
    id: "hero",
    marker: "hero",
    hold: 26,
    host: "stage",
    fit: "circle",
    box: "ring",
    pose: { yaw: -7, pitch: 3, fill: 1, lean: 1, ambient: 1 },
  },
  {
    id: "dive",
    marker: "dive",
    hold: 32,
    host: "stage",
    fit: "sphere",
    box: "rail",
    pose: { yaw: -30, pitch: 16, tilt: 45, explode: 0.12, wave: 0, arcs: [0.6, 0.6, 0.6, 0.6, 0.6], core: 0.6, offX: 0.06, fill: 0.84, lean: 0 },
  },
  {
    id: "stack",
    marker: "stack",
    hold: 32,
    host: "stage",
    fit: "sphere",
    box: "rail",
    pose: { yaw: -38, pitch: 22, tilt: 90, explode: 1, offX: 0, fill: 0.9, arcs: [1, 1, 1, 1, 1], core: 0, haze: 0, ambient: 0 },
    dom: { labels: "stack" },
  },
  station("st-interface", 1, 22),
  station("st-models", 2, 26),
  station("st-compute", 3, 18),
  station("st-data", 4, 12),
  {
    id: "locked",
    marker: "locked",
    hold: 20,
    host: "stage",
    fit: "sphere",
    box: "rail",
    pose: { explode: 0, lift: [0, 0, 0, 0, 0], ghost: 0, cutaway: 0, annot: 0, focus: 0, aim: 2, pitch: 20, fill: 0.9 },
    ease: { assembly: LOCK },
    dom: { labels: null },
  },
  capability(0),
  capability(1),
  capability(2),
  capability(3),
  {
    id: "finale",
    marker: "finale",
    hold: 20,
    host: "stage",
    fit: "circle",
    box: "ringTop",
    pose: { arcs: [1, 1, 1, 1, 1], playhead: 360, wave: 1, glass: 0.55, core: 0.4 },
    dom: { complete: true },
  },
  {
    id: "work",
    marker: "work",
    hold: 50,
    host: "stage",
    fit: "circle",
    box: "ring",
    pose: { yaw: 14, pitch: 5, arcs: [0.7, 0.7, 0.7, 0.7, 0.7], glass: 0.8, core: 0.4, wave: 0, spin: 1 / 6, fill: 1 },
  },
  // 01 Discovery: metal dissolves into construction lines (in the travel's last quarter).
  build(
    1,
    {
      yaw: -38,
      pitch: 22,
      tilt: 90,
      fill: 0.88,
      sketch: 1,
      explode: 0,
      ambient: 0,
      lean: 0,
      spin: 0,
      glass: 0.55,
      core: 0,
      wave: 0,
      arcs: [1, 1, 1, 1, 1],
      haze: 0.4,
    },
    { stagger: { look: [0.75, 0] } },
  ),
  // 02 Architecture: exploded, dimensioned.
  build(2, { explode: 1, annot: 1 }),
  // 03 Build: parts seat bottom-up and turn to metal as they land; the face is still dark.
  build(3, { explode: 0, sketch: 0, annot: 0, power: 0, draw: 0 }, { ease: { assembly: LOCK } }),
  // 04 Ship: arcs and ticks sweep, the core ignites.
  build(4, { power: 1, draw: 1, core: 0.6, wave: 1, ambient: 1 }),
  {
    id: "tools",
    marker: "tools",
    hold: 30,
    host: "stage",
    fit: "sphere",
    box: "rail",
    // ELEV: the tower seen almost level through a long lens (FOV 24 → 14 is a
    // dolly-zoom: the fit keeps the size). Yaw doesn't change — the engine is
    // turned, so a level view reads as a flat drawing from any azimuth.
    pose: { pitch: 2, fov: 14, explode: 0.6, lineArt: 1, core: 0, wave: 0, ambient: 0, fill: 0.86, haze: 0 },
    dom: { labels: "ports" },
  },
  {
    id: "studio",
    marker: "studio",
    hold: 20,
    host: "stage",
    fit: "sphere",
    box: "rail",
    // Three-quarter, so the agency/Myndstack switch reads from the side: module
    // offsets and gaps show; a face-on ring would hide them (and swinging from
    // the tools elevation to face-on is a 96° turn — over the speed limit).
    pose: { yaw: -28, pitch: 14, tilt: 40, fov: 24, explode: 0.22, lineArt: 0, align: 1, core: 0.6, wave: 1, ambient: 1, lean: 0, fill: 0.84, haze: 0.6 },
    dom: { labels: null },
  },
  {
    id: "pricing",
    marker: "pricing",
    hold: 100,
    host: "dock-pricing",
    fit: "circle",
    box: "dock",
    pose: { yaw: -10, pitch: 4, explode: 0, fill: 1, arcs: [1, 0.25, 0.25, 0.25, 0.25], playhead: 360, core: 0.4, wave: 0, lean: 0 },
  },
  {
    id: "faq",
    marker: "faq",
    hold: 60,
    host: "dock-faq",
    fit: "circle",
    box: "dock",
    pose: { yaw: 0, pitch: 0, arcs: [0.4, 0.4, 0.4, 0.4, 0.4], core: 0.3 },
  },
  // Closing: the power-on is scrubbed while the dock's top rises from the viewport's bottom to 20svh.
  {
    id: "closing-start",
    marker: "closing",
    ref: "top",
    anchor: 1,
    hold: 0,
    host: "dock-closing",
    fit: "circle",
    box: "dock",
    pose: { yaw: 0, pitch: -6, power: 0, draw: 0, core: 0, wave: 0, arcs: [1, 1, 1, 1, 1] },
  },
  {
    id: "closing",
    marker: "closing",
    ref: "top",
    anchor: 0.2,
    hold: 40,
    host: "dock-closing",
    fit: "circle",
    box: "dock",
    pose: { power: 1, draw: 1, core: 0.6, wave: 1, ambient: 1 },
    ease: { look: [0, 0, 1, 1] },
  },
];

/**
 * The designed page, top to bottom (desktop, pinned layout): each block's
 * length in svh and where its markers sit (centre, svh from the block's top;
 * `size` svh tall). The landing CSS implements these lengths.
 */
export type PlanBlock = {
  readonly block: string;
  readonly svh: number;
  readonly markers: readonly { readonly id: string; readonly at: number; readonly size?: number }[];
};

export const SCROLL_PLAN: readonly PlanBlock[] = [
  { block: "hero", svh: 100, markers: [{ id: "hero", at: 50, size: 60 }] },
  { block: "dive", svh: 90, markers: [{ id: "dive", at: 45 }] },
  { block: "stack", svh: 132, markers: [{ id: "stack", at: 62 }] },
  { block: "st-interface", svh: 100, markers: [{ id: "st-interface", at: 50 }] },
  { block: "st-models", svh: 100, markers: [{ id: "st-models", at: 50 }] },
  { block: "st-compute", svh: 100, markers: [{ id: "st-compute", at: 50 }] },
  { block: "st-data", svh: 100, markers: [{ id: "st-data", at: 50 }] },
  { block: "locked", svh: 60, markers: [{ id: "locked", at: 30 }] },
  { block: "caps-entry", svh: 70, markers: [] },
  { block: "cap-0", svh: 100, markers: [{ id: "cap-0", at: 50 }] },
  { block: "cap-1", svh: 100, markers: [{ id: "cap-1", at: 50 }] },
  { block: "cap-2", svh: 100, markers: [{ id: "cap-2", at: 50 }] },
  { block: "cap-3", svh: 100, markers: [{ id: "cap-3", at: 50 }] },
  { block: "finale", svh: 60, markers: [{ id: "finale", at: 30 }] },
  { block: "work", svh: 110, markers: [{ id: "work", at: 55 }] },
  {
    block: "process",
    svh: 240,
    markers: [
      { id: "build-1", at: 105, size: 1 },
      { id: "build-2", at: 130, size: 1 },
      { id: "build-3", at: 155, size: 1 },
      { id: "build-4", at: 180, size: 1 },
    ],
  },
  { block: "tools", svh: 140, markers: [{ id: "tools", at: 66, size: 1 }] },
  { block: "studio", svh: 100, markers: [{ id: "studio", at: 50 }] },
  { block: "pricing", svh: 160, markers: [{ id: "pricing", at: 40, size: 29 }] },
  { block: "faq", svh: 100, markers: [{ id: "faq", at: 40, size: 18 }] },
  { block: "closing", svh: 100, markers: [{ id: "closing", at: 29, size: 42 }] },
  { block: "contact", svh: 110, markers: [] },
];
