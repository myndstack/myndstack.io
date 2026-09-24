/**
 * Which poster stands in for the engine at each beat — the page's look with
 * no WebGL (no JS, reduced motion, the poster tier, print, and until the live
 * engine's first frame). Derived from the beat table, so a poster can never
 * drift from the pose it stands for:
 *
 * - face poses (circle fit) use the CoreRing SVG, placed on the beat's
 *   target circle by the director;
 * - every other pose is a technical drawing from its own pose (drawing.ts),
 *   one SVG <symbol> each.
 */
import { BEATS } from "./beats";
import { axisInCamera, posesById } from "./choreography";
import { drawEngine, type DrawView, type Drawing } from "./drawing";
import { STUDIO, STUDIO_AGENCY } from "./poster-ids";
import { AGENCY } from "./rig";
import { CH } from "./types";

export { STUDIO, STUDIO_AGENCY, posterFor, type Poster } from "./poster-ids";

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

const EXTRAS: Readonly<Record<string, Partial<DrawView>>> = {
  "build-2": { dims: true },
  tools: { ports: true },
};

function build(): DrawPoster[] {
  const poses = posesById(BEATS);
  const out: DrawPoster[] = [];
  for (const beat of BEATS) {
    if (beat.fit !== "sphere") continue;
    const pose = poses.get(beat.id);
    if (!pose) continue;
    const view: DrawView = {
      axis: axisInCamera(pose),
      explode: pose[CH.explode],
      fill: pose[CH.fill],
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
    if (beat.id === STUDIO) out.push({ ...poster, id: STUDIO_AGENCY, view: { ...view, ...AGENCY } });
  }
  return out;
}

export const DRAW_POSTERS: readonly DrawPoster[] = build();

export function drawingOf(poster: DrawPoster): Drawing {
  return drawEngine(poster.view);
}
