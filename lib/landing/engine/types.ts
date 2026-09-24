/**
 * Shared types of the landing engine. Everything under lib/landing/engine/ is
 * pure (no DOM, no three.js) so it runs in vitest; only gl/* touches WebGL.
 */

/** The engine's five modules, front to back along its axis. */
export const MODULES = ["face", "interface", "models", "compute", "data"] as const;
export type ModuleId = (typeof MODULES)[number];

/** The five arcs of the Core, clockwise from 12 (lib/motion/core-geometry.ts ARC_KEYS). */
export const ARCS = ["lime", "ai", "product", "design", "arch"] as const;
export type ArcKey = (typeof ARCS)[number];

/**
 * Pose channels. A pose is one Float32Array indexed by these, so sampling a
 * pose every frame allocates nothing. Angles are degrees, unwrapped (the table
 * authors the path; resolve() never re-wraps them).
 */
export const CH = {
  /** Camera azimuth around the world vertical. */
  yaw: 0,
  /** Camera elevation above the horizon. */
  pitch: 1,
  /** Engine axis tilt: 0 = axis toward the camera (FACE), 90 = axis vertical, face up (TOWER/ELEV). */
  tilt: 2,
  fov: 3,
  /** Share of the host box the engine fills (circle fit: box radius; sphere fit: limiting side). */
  fill: 4,
  /** Engine centre within the host box, as a fraction of its width/height from the box centre. */
  offX: 5,
  offY: 6,
  /** Global explode, 0 = assembled. */
  explode: 7,
  /** Per-module pull toward the camera (focus), 5 channels. */
  lift: 8,
  /** Ghosting of every module that isn't lifted. */
  ghost: 13,
  dim: 14,
  /** Per-arc emphasis, 5 channels in ARCS order. */
  arc: 15,
  /** Face draw-on (ticks and arcs sweep in). */
  draw: 20,
  /** Power: core, waveform and halos (closing power-on, process 04). */
  power: 21,
  /** Playhead angle, degrees clockwise from 12. */
  playhead: 22,
  /** Sketch mode: construction lines on dark (process 01). */
  sketch: 23,
  /** Forced line-art regardless of surface (tools schematic). */
  lineArt: 24,
  /** Studio alignment: 1 = Myndstack (aligned), 0 = agency (offset, gaps). */
  align: 25,
  /** Glass darkness behind the face. */
  glass: 26,
  core: 27,
  wave: 28,
  /** Idle motion allowed (0 while travelling, on paper, in docks without it). */
  ambient: 29,
  /** Pointer lean allowed (fine pointers, face-on holds). */
  lean: 30,
  /** Quarter-section cutaway on the lifted module, 0 → 1 = 0 → 90°. */
  cutaway: 31,
  /** Station annotations visible. */
  annot: 32,
  /** Process 03: parts seated, bottom-up. */
  build: 33,
  /** Atmosphere haze behind the engine (dark surfaces only). */
  haze: 34,
  /** Which module the camera aims at, as a continuous module index (0 face … 4 data). */
  aim: 35,
  /** Framing: 0 = the whole engine's bounds, 1 = the aimed module (stations). */
  focus: 36,
  /** Playhead auto-rotation, turns per second (work: synced to the documents' scan line). */
  spin: 37,
} as const;

export const POSE_LEN = 38;
export type ChannelName = keyof typeof CH;
export type Pose = Float32Array;

/** Authoring form of a pose: named channels; `lift` and `arcs` are per-module / per-arc. */
export type PoseSpec = Partial<Record<Exclude<ChannelName, "lift" | "arc">, number>> & {
  readonly lift?: readonly number[];
  readonly arcs?: readonly number[];
};

/** Channel groups share an ease and a delay/lead inside a travel. */
export type ChannelGroup = "orbit" | "assembly" | "look" | "arcs" | "playhead";
export type Bezier = readonly [number, number, number, number];

export type HostId = "stage" | "dock-pricing" | "dock-faq" | "dock-closing";
export type EngineBox = "rail" | "ring" | "ringTop" | "dock";
export type FitKind = "sphere" | "circle";

/** Which reference point of the marker sits on the anchor line at the hold's centre. */
export type MarkerRef = "top" | "center" | "bottom";

export type Beat = {
  readonly id: string;
  /** `[data-beat-marker="…"]` — an in-flow (never sticky) element. */
  readonly marker: string;
  readonly ref?: MarkerRef;
  /** Viewport fraction the marker's reference point sits at, mid-hold (default: the reading line). */
  readonly anchor?: number;
  /** Hold length in svh; 0 = a pass-through waypoint. */
  readonly hold: number;
  readonly host: HostId;
  readonly fit: FitKind;
  /**
   * Box within the host the engine fits into: the rail slot (columns 7–12),
   * the ring centred in it, the ring at its top over the readout plate
   * (capabilities), or a dock's own box.
   */
  readonly box: EngineBox;
  readonly pose: PoseSpec;
  /** Per-group ease of the travel INTO this beat (default: the group's ease). */
  readonly ease?: Partial<Record<ChannelGroup, Bezier>>;
  /** Per-group [delay, lead] of the travel into this beat, fractions of the travel. */
  readonly stagger?: Partial<Record<ChannelGroup, readonly [number, number]>>;
  /** DOM state written (on change) while this beat is current. */
  readonly dom?: {
    readonly labels?: "stack" | "ports" | "annot" | null;
    readonly cap?: number;
    readonly complete?: boolean;
  };
};

export type SurfaceKind = "ink" | "graphite" | "paper";

/** A surface band in document coordinates (px). */
export type SurfaceBand = {
  readonly top: number;
  readonly bottom: number;
  readonly kind: SurfaceKind;
};

/** `html[data-engine]`. Absent ("static") without JS or when motion is off. */
export type EngineState = "static" | "poster" | "loading" | "live" | "fallback";

export type QualityTier = "poster" | "low" | "medium" | "high";

export type TierParams = {
  readonly dprCap: number;
  readonly msaa: boolean;
  /** Level of detail: 0 = full. */
  readonly lod: 0 | 1 | 2;
  readonly halos: boolean;
  readonly hiddenLines: boolean;
  readonly dust: boolean;
  /** Frame rate of idle (ambient-only) frames; 0 = no idle motion. */
  readonly ambientFps: 0 | 30 | 60;
};

/** Values the page's own components hand the engine (lib/landing/engine/signals.ts). */
export type SignalMap = {
  readonly "studio.mode": "ours" | "agency";
  readonly "pricing.focus": number;
  readonly "faq.open": number;
  readonly "hero.intro": "playing" | "done";
};

/** A box in CSS px, relative to its host (or the viewport). */
export type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
