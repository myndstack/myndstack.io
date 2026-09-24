/**
 * The review prototype's one script: the real director (boot + live, the
 * WebGL renderer bundled in), the stage's overlay timelines, and the DOM
 * stand-ins for the React widgets (shims.ts) — run against the real
 * server-rendered /preview. scripts/prototype.mjs builds it into the page.
 */
import { startDirector } from "@/components/landing/engine/director/boot";
import { startLive } from "@/components/landing/engine/director/live";
import { chooseTier } from "@/components/landing/engine/director/tier";
import { demoTimeline, docsTimeline } from "@/components/landing/engine/overlay.motion";
import type { Timeline } from "@/lib/motion/anime/core";

import { mountKit } from "./kit";
import { mountShims } from "./shims";

/** StageOverlay's job without React: play a demo (or the documents) when its beat takes the stage. */
function overlays(): void {
  const stage = document.querySelector<HTMLElement>("[data-engine-stage]");
  if (!stage || document.documentElement.dataset.anim !== "on") return;
  let active: Timeline | null = null;
  let wanted: string | null = null;
  new MutationObserver(() => {
    const beat = stage.getAttribute("data-beat");
    if (beat === wanted) return;
    wanted = beat;
    active?.complete();
    active = null;
    const cap = beat ? /^cap-(\d)$/.exec(beat) : null;
    if (cap) active = demoTimeline(stage, Number(cap[1]));
    else if (beat === "work") active = docsTimeline(stage);
    active?.play();
  }).observe(stage, { attributes: true, attributeFilter: ["data-beat"] });
}

const root = document.querySelector<HTMLElement>(".landing");
if (root) {
  mountShims();
  overlays();
  startDirector(root, async () => {
    const tier = chooseTier();
    return tier === "poster" ? null : (host) => startLive(host, tier);
  });
  mountKit();
}
