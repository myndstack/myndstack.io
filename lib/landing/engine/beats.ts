/**
 * The beat table: one pose per beat, in page order — the whole choreography
 * of the pinned run as data. choreography.ts places these on the measured
 * page and samples poses between them; scenes.ts derives the page's scene
 * spacers, markers, fronts and text timing from the same numbers.
 *
 * Each beat names its scene (one sticky panel), the travel INTO it and its
 * hold (svh), the grid box the engine fits into, the stage's skin during the
 * hold and the accent it remaps. Poses are authored as deltas: a beat lists
 * only the channels it changes and carries everything else over from the
 * beat above (buildPoses), so a beat dropped at runtime (a section that
 * didn't render) never changes the ones after it.
 */
import type { BoxSpec } from "./layout";
import { ARCS, type Beat, type Bezier, type PoseSpec } from "./types";

/** Locks and detents: ~2% overshoot as each module seats, or the dial clicks round. */
export const LOCK: Bezier = [0.34, 1.4, 0.64, 1];

/** Mid-angle of each arc, clockwise from 12 (CORE: five 64° arcs with 8° gaps, lime centred on 12). */
export const ARC_MID = [0, 72, 144, 216, 288] as const;

/** Every channel's value above the first beat (`circle`, `cx`, `cy`, `cr` are derived, never authored). */
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
  portal: 0,
  dial: 0,
  circle: 0,
  cx: 0,
  cy: 0,
  cr: 0,
  rim: 1,
  grid: 0,
  dust: 0,
  vis: 1,
};

// Grid boxes (lib/landing/engine/layout.ts): columns on 12, rows as viewport fractions.
const RIGHT: BoxSpec = { cols: [6, 12], rows: [0.09, 0.97] };
const RIGHT_BLEED: BoxSpec = { cols: [6, 12], rows: [0, 1] };
const TOWER: BoxSpec = { cols: [6, 12], rows: [0.03, 0.97] };
const STATION: BoxSpec = { cols: [8, 12], rows: [0.12, 0.92] };
const RAIL: BoxSpec = { cols: [7, 12], rows: [0.05, 0.95] };
const LEFT: BoxSpec = { cols: [1, 6], rows: [0.04, 0.96] };
const LEFT_BLEED: BoxSpec = { cols: [1, 5], rows: [0, 1] };
/** The porthole: sized on columns 4–12, so narrow screens shrink it and the left cells keep their room. */
const PORTHOLE: BoxSpec = { cols: [4, 12], rows: [0, 1] };
const FLOOR: BoxSpec = { cols: [1, 12], rows: [0.08, 0.5] };

/**
 * Travels allowed to turn the object faster than the usual 66°/100svh: the
 * tower swinging face-on into the capabilities' porthole, and the ring
 * turning back into a tower as the page bleaches into the build.
 */
export const SIGNATURE: ReadonlySet<string> = new Set(["cap-0", "build-1"]);

const onlyLift = (module: number) => [0, 1, 2, 3, 4].map((k) => (k === module ? 1 : 0));

/** Stations: the camera descends the tower, one module pulled out and cut away per stop. */
const station = (id: string, module: number, pitch: number, accent: Beat["accent"]): Beat => ({
  id,
  scene: "stack",
  travel: 25,
  hold: 30,
  fit: "sphere",
  box: STATION,
  skin: "drafting",
  accent,
  pose: { aim: module, focus: 1, lift: onlyLift(module), ghost: 0.75, cutaway: 1, annot: 1, pitch, fill: 0.92 },
  dom: { labels: "annot" },
});

/**
 * Capabilities: the porthole. Each detent turns the dial so the active arc
 * sits under the lime index at 12; past arcs stay lit at 55%, upcoming 20%.
 */
const capability = (i: number): Beat => ({
  id: `cap-${i}`,
  scene: "caps",
  travel: i === 0 ? 60 : 40,
  hold: 35,
  fit: "circle",
  box: PORTHOLE,
  skin: "machined",
  accent: ARCS[i + 1],
  pose: {
    yaw: 0,
    pitch: 0,
    tilt: 0,
    explode: 0,
    fill: 0.74,
    offX: 0,
    offY: 0,
    glass: 0.85,
    core: 0.2,
    wave: 0,
    haze: 0.5,
    ambient: 1,
    lean: 1,
    portal: 1,
    dial: -ARC_MID[i + 1],
    playhead: 0,
    arcs: ARCS.map((_, k) => (k === 0 || k - 1 < i ? 0.55 : k - 1 === i ? 1 : 0.2)),
  },
  ease: { playhead: LOCK },
  dom: { cap: i, labels: null },
});

/** Process: the engine being built, on the tower in the rail. */
const build = (step: number, travel: number, skin: Beat["skin"], pose: PoseSpec, extra: Partial<Beat> = {}): Beat => ({
  id: `build-${step}`,
  scene: "process",
  travel,
  hold: 30,
  fit: "sphere",
  box: RAIL,
  skin,
  accent: "lime",
  pose,
  ...extra,
});

export const BEATS: readonly Beat[] = [
  {
    id: "hero",
    scene: "intro",
    travel: 0,
    hold: 40,
    fit: "circle",
    box: RIGHT,
    skin: "machined",
    accent: "lime",
    // At 88% the bezel (2.3 / 2.1 of the CORE circle) keeps 24px off the copy.
    // The iris is open: the bore shows the stack shipping (ShipConsole).
    pose: { yaw: -7, pitch: 3, fill: 0.88, lean: 1, ambient: 1, dust: 1, portal: 1, wave: 0 },
  },
  {
    id: "dive",
    scene: "intro",
    travel: 60,
    hold: 30,
    fit: "sphere",
    box: RIGHT_BLEED,
    skin: "machined",
    accent: "lime",
    // Seams open and every light-pipe glows; the scan then turns it to ink.
    pose: { yaw: -30, pitch: 15, tilt: 45, explode: 0.3, wave: 0, portal: 0, arcs: [0.6, 0.6, 0.6, 0.6, 0.6], core: 0.6, lean: 0, fill: 1.1, offX: 0.08, offY: 0.06 },
    // The iris shuts before the ring turns away (the bore is cut in screen space, face-on only).
    stagger: { iris: [0, 0.65] },
  },
  {
    id: "stack",
    scene: "stack",
    travel: 70,
    hold: 45,
    fit: "sphere",
    box: TOWER,
    skin: "drafting",
    accent: "lime",
    pose: { yaw: -38, pitch: 22, tilt: 90, explode: 1, offX: 0, offY: 0, fill: 0.96, arcs: [1, 1, 1, 1, 1], core: 0, haze: 0, ambient: 0, dust: 0 },
    dom: { labels: "stack" },
  },
  station("st-interface", 1, 22, "product"),
  station("st-models", 2, 24, "ai"),
  station("st-compute", 3, 20, "design"),
  station("st-data", 4, 16, "arch"),
  {
    id: "locked",
    scene: "stack",
    travel: 45,
    hold: 10,
    fit: "sphere",
    box: TOWER,
    skin: "drafting",
    accent: "lime",
    // Seating also swings the camera part-way round, so the turn face-on stays inside the speed limits.
    pose: { explode: 0, lift: [0, 0, 0, 0, 0], ghost: 0, cutaway: 0, annot: 0, focus: 0, aim: 2, yaw: -20, pitch: 12, fill: 0.9 },
    ease: { assembly: LOCK },
    dom: { labels: null },
  },
  capability(0),
  capability(1),
  capability(2),
  capability(3),
  {
    id: "finale",
    scene: "caps",
    travel: 40,
    hold: 35,
    fit: "circle",
    box: LEFT,
    skin: "machined",
    accent: "lime",
    pose: { arcs: [1, 1, 1, 1, 1], dial: -360, wave: 1, glass: 0.55, core: 0.4, portal: 1, fill: 0.86, offX: 0, lean: 1 },
    ease: { playhead: LOCK },
    dom: { complete: true },
  },
  {
    id: "work",
    scene: "work",
    travel: 55,
    hold: 50,
    fit: "circle",
    box: LEFT,
    skin: "machined",
    accent: "lime",
    pose: { yaw: 10, pitch: 5, arcs: [0.7, 0.7, 0.7, 0.7, 0.7], glass: 0.8, core: 0.4, wave: 0, spin: 1 / 6, portal: 0, fill: 0.86, offX: 0 },
    // The iris closes first, then the ring carries and turns.
    stagger: { iris: [0, 0.5] },
  },
  // 01 Discovery: the ring turns back into a tower, drawn in construction lines.
  build(
    1,
    60,
    "drafting",
    {
      yaw: -16,
      pitch: 16,
      tilt: 90,
      fill: 0.9,
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
      dust: 0,
    },
    { stagger: { look: [0.75, 0] } },
  ),
  // 02 Architecture: exploded, dimensioned.
  build(2, 30, "drafting", { explode: 1, annot: 1 }),
  // 03 Build: the scan rises, and parts seat bottom-up as metal; the face is still dark.
  build(3, 45, "machined", { explode: 0, sketch: 0, annot: 0, power: 0, draw: 0 }, { ease: { assembly: LOCK } }),
  // 04 Ship: arcs and ticks sweep, the core ignites.
  build(4, 30, "machined", { power: 1, draw: 1, core: 0.6, wave: 1, ambient: 1, dust: 1 }),
  {
    id: "tools",
    scene: "tools",
    travel: 50,
    hold: 55,
    fit: "sphere",
    box: RAIL,
    skin: "machined",
    accent: "lime",
    // A side elevation through a long lens (FOV 24 → 14 is a dolly-zoom: the
    // fit keeps the size), each port lit in its group's hue as a leader lands.
    pose: { pitch: 8, fov: 14, explode: 0.6, core: 0, wave: 0, ambient: 0, fill: 0.86, haze: 0, dust: 0 },
    dom: { labels: "ports" },
  },
  {
    id: "studio-founder",
    scene: "studio",
    travel: 65,
    hold: 45,
    fit: "sphere",
    box: LEFT_BLEED,
    skin: "machined",
    accent: "lime",
    // Three-quarter, carried to the left edge and past it: the ID card has the right.
    pose: { yaw: -28, pitch: 14, tilt: 60, fov: 24, explode: 0.22, core: 0.6, wave: 1, ambient: 1, lean: 0, fill: 1.1, offX: -0.3, haze: 0.6, dust: 1 },
    dom: { labels: null },
  },
  {
    id: "studio-contrast",
    scene: "studio",
    travel: 62,
    hold: 60,
    fit: "sphere",
    box: RAIL,
    skin: "machined",
    accent: "lime",
    // The agency ↔ Myndstack switch acts on `align` (a signal, not the scroll).
    pose: { yaw: -24, pitch: 12, tilt: 50, explode: 0.3, fill: 0.9, offX: 0 },
  },
  // Closing: behind the pricing and FAQ sheets the ring settles, powered off,
  // on its floor; uncovered, it powers on as the page scrolls.
  {
    id: "closing-start",
    scene: "closing",
    travel: 0,
    hold: 0,
    fit: "circle",
    box: FLOOR,
    skin: "drafting",
    accent: "lime",
    pose: {
      yaw: 0,
      pitch: -6,
      tilt: 0,
      explode: 0,
      fill: 0.9,
      offX: 0,
      offY: 0,
      power: 0,
      draw: 0,
      core: 0,
      wave: 0,
      arcs: [1, 1, 1, 1, 1],
      glass: 0.55,
      portal: 0,
      lean: 0,
      ambient: 0,
      dust: 0,
      rim: 0,
    },
  },
  {
    id: "closing",
    scene: "closing",
    travel: 50,
    hold: 45,
    fit: "circle",
    box: FLOOR,
    skin: "machined",
    accent: "lime",
    // The words wait for ignition (the develop): light type on the machined skin.
    enter: 0.05,
    pose: { power: 1, draw: 1, core: 0.6, wave: 1, ambient: 1, rim: 1 },
    ease: { look: [0, 0, 1, 1] },
  },
];
