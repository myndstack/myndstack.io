/**
 * Which poster stands in for the engine at each beat — the page's look with
 * no WebGL (no JS, reduced motion, the poster tier, print, and until the live
 * engine's first frame). Derived from the beat table, so a poster can never
 * drift from the pose it stands for:
 *
 * - face poses (circle fit) use the CoreRing SVG, in the ring box or the ring
 *   box at the top of the rail (capabilities);
 * - every other stage pose is a technical drawing from its own pose
 *   (drawing.ts), one SVG <symbol> each;
 * - docks keep their own small ring.
 */
import { BEATS } from "./beats";
import { axisInCamera, posesById } from "./choreography";
import { drawEngine, type DrawView, type Drawing } from "./drawing";
import { CH } from "./types";

export type Poster =
  | { readonly kind: "face"; readonly box: "ring" | "ringTop" }
  | { readonly kind: "draw"; readonly id: string }
  | { readonly kind: "dock" };

export type DrawPoster = {
  /** The symbol's id suffix: the beat id (or STUDIO_AGENCY). */
  readonly id: string;
  readonly view: DrawView;
  /** Module drawn at full strength (stations); the rest are ghosted. */
  readonly focus?: number;
  /** Construction lines: every line in the sketch colour, no hues (process 01). */
  readonly sketch: boolean;
  /** The face's arcs lit (off while the engine is being built). */
  readonly powered: boolean;
};

/** The studio's second drawing: the same engine, as an agency would ship it. */
export const STUDIO_AGENCY = "studio-agency";

/** Offsets, extra gaps and rolls per module (face first) for the agency state: nothing lines up. */
const AGENCY = {
  shift: [0, 0.26, -0.22, 0.3, -0.16],
  gap: [0, 0.14, 0.34, 0.12, 0.4],
  roll: [0, 5, -4, 3, -5],
} as const;

const EXTRAS: Readonly<Record<string, Partial<DrawView>>> = {
  "build-2": { dims: true },
  tools: { ports: true },
};

function build(): DrawPoster[] {
  const poses = posesById(BEATS);
  const out: DrawPoster[] = [];
  for (const beat of BEATS) {
    if (beat.host !== "stage" || beat.fit !== "sphere") continue;
    const pose = poses.get(beat.id);
    if (!pose) continue;
    const view: DrawView = {
      axis: axisInCamera(pose),
      explode: pose[CH.explode],
      fill: pose[CH.fill],
      teeth: true,
      arcs: true,
      ...EXTRAS[beat.id],
    };
    const poster: DrawPoster = {
      id: beat.id,
      view,
      sketch: pose[CH.sketch] > 0.5,
      powered: pose[CH.power] > 0.5 && pose[CH.draw] > 0.5,
      ...(pose[CH.focus] > 0.5 ? { focus: Math.round(pose[CH.aim]) } : {}),
    };
    out.push(poster);
    if (beat.id === "studio") out.push({ ...poster, id: STUDIO_AGENCY, view: { ...view, ...AGENCY } });
  }
  return out;
}

export const DRAW_POSTERS: readonly DrawPoster[] = build();

export function drawingOf(poster: DrawPoster): Drawing {
  return drawEngine(poster.view);
}

export function posterFor(beatId: string): Poster | null {
  const beat = BEATS.find((b) => b.id === beatId);
  if (!beat) return null;
  if (beat.host !== "stage") return { kind: "dock" };
  if (beat.fit === "circle") return { kind: "face", box: beat.box === "ringTop" ? "ringTop" : "ring" };
  return { kind: "draw", id: beat.id };
}
