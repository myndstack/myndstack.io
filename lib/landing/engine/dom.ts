/**
 * What the page shows for a beat, beyond the engine itself: which poster the
 * stage holds, which capability is lit, which process step, which labels.
 * The director writes these as data attributes — only when they change — and
 * CSS does the rest. Pure, so the mapping is unit-tested.
 */
import { CAPABILITY_HUES } from "@/lib/landing/chapters";

import { STUDIO_AGENCY, posterFor } from "./posters";
import type { Beat } from "./types";

export type BeatDom = {
  readonly beat: string | null;
  /** `data-poster` of the stage poster to show (null: the canvas is in a dock). */
  readonly poster: string | null;
  /** Capability index while one holds the stage; their count at the finale. */
  readonly cap: number | null;
  /** The lit capability's hue, or "spectrum" at the finale. */
  readonly hue: string | null;
  readonly complete: boolean;
  readonly labels: string | null;
  /** Process step 1–4 (and 4 for good once it's built). */
  readonly step: number | null;
};

const EMPTY: BeatDom = { beat: null, poster: null, cap: null, hue: null, complete: false, labels: null, step: null };

export function beatDom(beats: readonly Beat[], index: number, studio: "ours" | "agency"): BeatDom {
  const beat = beats[index];
  if (!beat) return EMPTY;

  const poster = posterFor(beat.id);
  let key: string | null = null;
  if (poster?.kind === "face") key = poster.box === "ringTop" ? "face-top" : "face-ring";
  else if (poster?.kind === "draw") key = poster.id === "studio" && studio === "agency" ? STUDIO_AGENCY : poster.id;

  const complete = beat.dom?.complete === true;
  const cap = beat.dom?.cap ?? (complete ? CAPABILITY_HUES.length : null);
  const hue = cap === null ? null : (CAPABILITY_HUES[cap] ?? "spectrum");

  const firstBuild = beats.findIndex((b) => b.id.startsWith("build-"));
  const lastBuild = beats.findLastIndex((b) => b.id.startsWith("build-"));
  let step: number | null = null;
  if (firstBuild >= 0 && index >= firstBuild) step = index > lastBuild ? lastBuild - firstBuild + 1 : index - firstBuild + 1;

  return { beat: beat.id, poster: key, cap, hue, complete, labels: beat.dom?.labels ?? null, step };
}
