/**
 * Which poster stands in for the engine at a beat — just the id, from the
 * beat table alone, so the first-load director can switch posters without
 * the drawing and pose maths (posters.ts, which builds the drawings, runs on
 * the server).
 */
import { BEATS } from "./beats";

export type Poster = { readonly kind: "face" } | { readonly kind: "draw"; readonly id: string };

/** The studio's second drawing: the same engine, as an agency would ship it. */
export const STUDIO_AGENCY = "studio-agency";
/** The beat the agency ↔ Myndstack switch acts on. */
export const STUDIO = "studio-contrast";

/** Face poses (circle fit) use the CoreRing SVG; every other pose has its own drawing. */
export function posterFor(beatId: string): Poster | null {
  const beat = BEATS.find((b) => b.id === beatId);
  if (!beat) return null;
  return beat.fit === "circle" ? { kind: "face" } : { kind: "draw", id: beat.id };
}
