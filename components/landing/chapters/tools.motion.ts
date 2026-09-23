/**
 * §06 — plays once on entry: the tick ruler runs out, each group's hue bar
 * grows, and the marks rise into place.
 */
import { createTimeline, cubicBezier, stagger } from "@/lib/motion/anime/core";
import type { ChapterContext, ChapterMotion } from "@/lib/motion/chapter";
import { EASE_OUT_EXPO, STAGGER } from "@/lib/motion/tokens";

const expo = cubicBezier(...EASE_OUT_EXPO);

export default function buildTools({ root }: ChapterContext): ChapterMotion {
  const all = <T extends Element>(sel: string) => Array.from(root.querySelectorAll<T>(sel));
  const tl = createTimeline({ autoplay: false, defaults: { ease: expo } });
  tl.add(all(".rack-ruler"), { scaleX: [0, 1], duration: 900 }, 0);
  tl.add(all(".rack-bar"), { scaleX: [0, 1], duration: 600, delay: stagger(STAGGER.block) }, 200);
  tl.add(all(".rack-item"), { opacity: [0, 1], y: [14, 0], duration: 500, delay: stagger(STAGGER.char) }, 360);
  return { timeline: tl };
}
