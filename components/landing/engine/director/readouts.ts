/**
 * The title block's words: which section you're on, and a live status line
 * for what the stage is doing — in the studio's own voice (software, not
 * machinery), and only facts the page itself shows. DRAFT micro-copy.
 */
import { CAPABILITY_ROUTES, RULER_CHAPTERS } from "@/lib/landing/chapters";
import type { Beat } from "@/lib/landing/engine/types";

const pad = (n: number) => String(n).padStart(2, "0");

export function sheetLabel(chapter: string | null): { readonly sheet: string; readonly name: string } {
  const i = Math.max(0, RULER_CHAPTERS.findIndex((c) => c.id === chapter));
  return { sheet: `${pad(i + 1)}/${pad(RULER_CHAPTERS.length)}`, name: RULER_CHAPTERS[i].label };
}

/** "" on the hero: its readout is the studio's own (LOC · IST · BUILD), set in the markup. */
export function readout(beat: string, beats: readonly Beat[]): string {
  const station = /^st-(.+)$/.exec(beat);
  const cap = /^cap-(\d)$/.exec(beat);
  const build = /^build-(\d)$/.exec(beat);
  const layers = pad(beats.filter((b) => b.id.startsWith("st-")).length);
  const caps = pad(beats.filter((b) => b.id.startsWith("cap-")).length);
  if (beat === "hero" || beat === "") return "";
  if (beat === "dive") return "stack.open()";
  if (beat === "stack") return `stack.ts · ${layers} layers`;
  if (station) return `Layer ${pad(beats.filter((b) => b.id.startsWith("st-")).findIndex((b) => b.id === beat) + 1)}/${layers} · ${station[1]}`;
  if (beat === "locked") return `Deployed · ${layers}/${layers} healthy`;
  if (cap) return `Route ${CAPABILITY_ROUTES[Number(cap[1])]} · ${pad(Number(cap[1]) + 1)}/${caps}`;
  if (beat === "finale") return `${caps}/${caps} routes live`;
  if (beat === "work") return "Case study · shipped";
  if (build) return `Step ${pad(Number(build[1]))}/04`;
  if (beat === "tools") return "Integrations · 04 groups";
  if (beat === "studio-founder") return "whoami · founder";
  if (beat === "studio-contrast") return "diff · agency → studio";
  if (beat.startsWith("closing")) return "Ready · new project";
  return "";
}
