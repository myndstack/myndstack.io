"use client";

import { useEffect } from "react";

import type { Timeline } from "@/lib/motion/anime/core";
import { registerChapter } from "@/lib/motion/registry";

type Overlay = typeof import("./overlay.motion");

/**
 * Plays the stage's overlays when their beat arrives — a capability's demo as
 * its chapter takes the ring, the document fan as the work does — by watching
 * the director's `data-beat` on the stage. The timelines load lazily, the
 * first time one is needed; until then (or if they never load) the overlays
 * sit in their built, server-rendered state.
 */
export default function StageOverlay() {
  useEffect(() => {
    const stage = document.querySelector<HTMLElement>("[data-engine-stage]");
    if (!stage || document.documentElement.dataset.anim !== "on") return;

    let overlay: Overlay | null = null;
    let loading: Promise<Overlay> | null = null;
    let active: Timeline | null = null;
    let wanted: string | null = null;
    let cancelled = false;

    const finish = () => {
      active?.complete();
      active = null;
    };

    const play = (beat: string | null) => {
      wanted = beat;
      const cap = beat ? /^cap-(\d)$/.exec(beat) : null;
      if (!cap && beat !== "work") return;
      if (!overlay) {
        loading ??= import("./overlay.motion");
        loading.then(
          (mod) => {
            overlay = mod;
            if (!cancelled && wanted === beat) play(beat);
          },
          () => undefined,
        );
        return;
      }
      finish();
      active = cap ? overlay.demoTimeline(stage, Number(cap[1])) : overlay.docsTimeline(stage);
      active?.play();
    };

    const observer = new MutationObserver(() => {
      const beat = stage.getAttribute("data-beat");
      if (beat !== wanted) play(beat);
    });
    observer.observe(stage, { attributes: true, attributeFilter: ["data-beat"] });
    const unregister = registerChapter(finish);

    return () => {
      cancelled = true;
      observer.disconnect();
      unregister();
      finish();
    };
  }, []);

  return null;
}
