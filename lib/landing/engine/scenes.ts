/**
 * The page the beat table implies, and what changes as it scrolls — pure,
 * so every rule here is a unit test rather than a hope:
 *
 * - The page: pinned scenes (one sticky panel each, over one page-wide
 *   stage) and flowing sheets (pricing, FAQ, contact) that slide over them.
 *   planScenes() turns the table's travels and holds into each scene's
 *   spacer length and its beats' markers; the CSS reads them inline.
 * - Fronts: the stage's skin only ever changes at one — a scan line, a
 *   circular develop from the core, or a cut while a sheet hides the stage.
 * - Words: scrub the object, trigger the words. A beat's words exit just
 *   after its hold, the next travel runs with nothing to read, and the next
 *   words come in at 70% of it (hysteresis both ways), so at rest every word
 *   is fully in or fully out.
 */
import { BEATS } from "./beats";
import { READING, type Placed } from "./timeline";
import type { Skin } from "./skins";
import type { Beat, SceneId } from "./types";

export type FlowId = "pricing" | "faq" | "contact";
export type PageItem =
  | { readonly kind: "scene"; readonly id: SceneId }
  | { readonly kind: "flow"; readonly id: FlowId; readonly skin: Skin };

/** The landing, top to bottom. */
export const PAGE: readonly PageItem[] = [
  { kind: "scene", id: "intro" },
  { kind: "scene", id: "stack" },
  { kind: "scene", id: "caps" },
  { kind: "scene", id: "work" },
  { kind: "scene", id: "process" },
  { kind: "scene", id: "tools" },
  { kind: "scene", id: "studio" },
  { kind: "flow", id: "pricing", skin: "drafting" },
  { kind: "flow", id: "faq", skin: "drafting" },
  { kind: "scene", id: "closing" },
  { kind: "flow", id: "contact", skin: "machined" },
];

/** svh: a scene's sticky panel; a sheet sliding over the panel above it; the uncover before the closing's first beat. */
export const PANEL = 100;
export const SLIDE = 100;
export const UNCOVER = 80;

// ---- The page -----------------------------------------------------------------

export type Span = { readonly id: string; readonly start: number; readonly end: number };

export type ScenePlan = {
  readonly id: SceneId;
  /** Spacer length, svh (its 100svh panel included). */
  readonly length: number;
  /** The spacer overlaps whatever is above it by a panel (`margin-top: -100svh`). */
  readonly overlap: boolean;
  /** Where an anchor jump lands: the first hold's start, svh from the spacer's top. */
  readonly land: number;
  /** Each beat's hold, svh from the moment the panel pins. */
  readonly holds: readonly Span[];
  /** Each beat's marker centre, svh from the spacer's top. */
  readonly markers: readonly { readonly id: string; readonly at: number }[];
};

/**
 * Scene spacers. A travel between two scenes is split at its middle: the old
 * panel's words have gone, the new one's aren't in yet, and the two
 * (transparent) panels swap unseen. A scene before a sheet stays pinned a
 * screen past its last hold while the sheet slides over it; one after a
 * sheet pins as the sheet's bottom edge starts to uncover it.
 */
export function planScenes(beats: readonly Beat[] = BEATS): readonly ScenePlan[] {
  const present = PAGE.filter((item) => item.kind === "flow" || beats.some((b) => b.scene === item.id));
  const firstBeat = (scene: SceneId) => beats.find((b) => b.scene === scene);
  const plans: ScenePlan[] = [];
  present.forEach((item, idx) => {
    if (item.kind !== "scene") return;
    const own = beats.filter((b) => b.scene === item.id);
    const prev = present[idx - 1];
    const next = present[idx + 1];
    const lead = !prev ? 0 : prev.kind === "flow" ? UNCOVER + own[0].travel : own[0].travel / 2;
    let t = lead;
    const holds = own.map((b, k) => {
      if (k > 0) t += b.travel;
      const start = t;
      t += b.hold;
      return { id: b.id, start, end: t };
    });
    const tail = !next ? 0 : next.kind === "flow" ? SLIDE : (firstBeat(next.id)?.travel ?? 0) / 2;
    plans.push({
      id: item.id,
      length: t + tail + PANEL,
      overlap: Boolean(prev),
      land: holds.find((h) => h.end > h.start)?.start ?? holds[0].start,
      holds,
      markers: holds.map((h) => ({ id: h.id, at: (h.start + h.end) / 2 + READING * 100 })),
    });
  });
  return plans;
}

// ---- Fronts ---------------------------------------------------------------------

export type FrontKind = "scan" | "develop" | "cut";

/**
 * Where a front happens: a phase of `beat` (-1 → 0 its travel in, 0 → 1 its
 * hold). A scan crosses mid-screen there and takes `span` svh of scroll to
 * cross the whole screen (100 = pinned to the page, like a sheet's edge); a
 * develop fires there (560ms, from the core); a cut is instant, for when a
 * sheet covers the stage.
 */
export type FrontSpec = {
  readonly kind: FrontKind;
  readonly beat: string;
  readonly phase: number;
  readonly to: Skin;
  readonly span?: number;
};

export const FRONTS: readonly FrontSpec[] = [
  // The dive: the scan rises through the held engine and its statement, into the stack.
  { kind: "scan", beat: "dive", phase: 0.6, to: "drafting" },
  // The lock: once LOCKED has read, metal floods out from the core as the tower turns.
  { kind: "develop", beat: "cap-0", phase: -0.85, to: "machined" },
  // Into the build: the page bleaches back to paper around the ring.
  { kind: "develop", beat: "build-1", phase: -0.5, to: "drafting" },
  // 03 Build: the scan rises with the parts as they seat.
  { kind: "scan", beat: "build-3", phase: -0.5, to: "machined", span: 45 },
  // Behind the pricing and FAQ sheets, the stage turns to paper for the closing.
  { kind: "cut", beat: "closing-start", phase: -0.5, to: "drafting" },
  // Ignition.
  { kind: "develop", beat: "closing", phase: 0, to: "machined" },
];

export type Front = {
  readonly kind: FrontKind;
  /** Scroll px where it happens (a scan: where its line crosses mid-screen). */
  readonly y: number;
  /** A scan's full crossing, px of scroll. */
  readonly span: number;
  readonly from: Skin;
  readonly to: Skin;
};

/** Scroll px at a phase of beat `i` (-1 → 0 its travel in, 0 → 1 its hold). */
export function scrollAt(res: Placed, i: number, phase: number): number {
  const start = res.starts[i];
  if (phase <= 0) return start + phase * (start - (i > 0 ? res.ends[i - 1] : start));
  return start + phase * (res.ends[i] - start);
}

/** The fronts on the resolved page, each from the skin the one before it left. */
export function placeFronts(res: Placed, specs: readonly FrontSpec[] = FRONTS): readonly Front[] {
  let skin: Skin = res.beats[0]?.skin ?? "machined";
  const out: Front[] = [];
  for (const f of specs) {
    const i = res.beats.findIndex((b) => b.id === f.beat);
    if (i < 0 || f.to === skin) continue;
    out.push({ kind: f.kind, y: scrollAt(res, i, f.phase), span: ((f.span ?? 100) * res.vh) / 100, from: skin, to: f.to });
    skin = f.to;
  }
  return out;
}

export type StageState = {
  /** Index of the last front reached (a scan counts from when its line enters). */
  readonly passed: number;
  /** The stage's skin — above the line while a scan crosses. */
  readonly skin: Skin;
  /** Below a crossing scan's line. */
  readonly next: Skin | null;
  /** A crossing scan's line, viewport px from the top. */
  readonly line: number | null;
};

/** svh a develop holds through when scrolled back (so a wobble never re-fires it). */
export const DEVELOP_BAND = 4;

export function stageAt(fronts: readonly Front[], initial: Skin, y: number, vh: number, prev: number): StageState {
  const band = (DEVELOP_BAND * vh) / 100;
  let passed = -1;
  for (let i = 0; i < fronts.length; i++) {
    const f = fronts[i];
    const at = f.kind === "scan" ? f.y - f.span / 2 : f.kind === "develop" && i <= prev ? f.y - band : f.y;
    if (y >= at) passed = i;
    else break;
  }
  if (passed < 0) return { passed, skin: initial, next: null, line: null };
  const f = fronts[passed];
  if (f.kind === "scan" && y < f.y + f.span / 2) {
    return { passed, skin: f.from, next: f.to, line: vh / 2 - ((y - f.y) * vh) / f.span };
  }
  return { passed, skin: f.to, next: null, line: null };
}

/** A flowing sheet's document range and skin (it covers the stage). */
export type Sheet = { readonly top: number; readonly bottom: number; readonly skin: Skin };

/** The skin under a viewport row — what the nav, ruler and title block take on. */
export function skinAtRow(stage: StageState, sheets: readonly Sheet[], y: number, row: number): Skin {
  const at = y + row;
  for (const s of sheets) if (at >= s.top && at < s.bottom) return s.skin;
  if (stage.line !== null && stage.next && row >= stage.line) return stage.next;
  return stage.skin;
}

// ---- Words ----------------------------------------------------------------------

/** Default entry phase: 70% of the travel. */
const ENTER = -0.3;
/** Words leave 12% into the next travel, and never more than 8svh after the hold. */
const EXIT_SHARE = 0.12;
const EXIT_MAX = 8;
/** svh of hysteresis either side of a window. */
export const WORDS_BAND = 2;

export type TextWindows = {
  /** Scroll px each beat's words come in and leave (NaN: a waypoint, never). */
  readonly enter: Float64Array;
  readonly exit: Float64Array;
  readonly band: number;
};

export function textWindows(res: Placed, vh: number): TextWindows {
  const n = res.beats.length;
  const enter = new Float64Array(n);
  const exit = new Float64Array(n);
  const sheetAfter = sheetFollows();
  for (let i = 0; i < n; i++) {
    const beat = res.beats[i];
    if (res.via[i] || (beat.hold === 0 && i > 0 && i < n - 1)) {
      enter[i] = Number.NaN;
      exit[i] = Number.NaN;
      continue;
    }
    enter[i] = i === 0 ? -Infinity : scrollAt(res, i, beat.enter ?? ENTER);
    if (i === n - 1) exit[i] = Infinity;
    else if (sheetAfter.has(beat.id)) exit[i] = res.ends[i] + (SLIDE * vh) / 100;
    else exit[i] = res.ends[i] + Math.min(EXIT_SHARE * (res.starts[i + 1] - res.ends[i]), (EXIT_MAX * vh) / 100);
  }
  return { enter, exit, band: (WORDS_BAND * vh) / 100 };
}

/** The last beat of every scene a sheet slides over: its words stay, and are covered. */
function sheetFollows(): ReadonlySet<string> {
  const out = new Set<string>();
  PAGE.forEach((item, i) => {
    if (item.kind !== "scene" || PAGE[i + 1]?.kind !== "flow") return;
    const last = BEATS.filter((b) => b.scene === item.id).at(-1);
    if (last) out.add(last.id);
  });
  return out;
}

/** Whose words are in at `y` (-1: nobody's). `prev` is last frame's answer. */
export function wordsAt(win: TextWindows, y: number, prev: number): number {
  if (prev >= 0 && y >= win.enter[prev] - win.band && y <= win.exit[prev] + win.band) return prev;
  for (let i = 0; i < win.enter.length; i++) if (y >= win.enter[i] && y <= win.exit[i]) return i;
  return -1;
}

/** A scene's own furniture (the parts list, the step list) is in from its first words to its last. */
export function sceneWindows(res: Placed, win: TextWindows): ReadonlyMap<SceneId, readonly [number, number]> {
  const out = new Map<SceneId, readonly [number, number]>();
  res.beats.forEach((b, i) => {
    if (Number.isNaN(win.enter[i])) return;
    const had = out.get(b.scene);
    out.set(b.scene, had ? [had[0], win.exit[i]] : [win.enter[i], win.exit[i]]);
  });
  return out;
}
