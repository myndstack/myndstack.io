/**
 * For chapters whose only motion is a CSS loop (the pricing beam, the closing
 * horizon's pulse): no timeline of its own, just `is-ambient` on the chapter
 * root while it's on screen and the tab is visible — so the loop never runs
 * where nobody can see it.
 */
import { createTimeline } from "@/lib/motion/anime/core";
import type { ChapterContext, ChapterMotion } from "@/lib/motion/chapter";

export default function buildAmbient({ root }: ChapterContext): ChapterMotion {
  return {
    timeline: createTimeline({ autoplay: false }),
    ambient: {
      play: () => root.classList.add("is-ambient"),
      pause: () => root.classList.remove("is-ambient"),
    },
    dispose: () => root.classList.remove("is-ambient"),
  };
}
