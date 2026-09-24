/**
 * §04 — plays once as the work enters: the real metrics count up to exactly
 * their CMS values. In the static layout the case's own figure plays too —
 * the controlled documents rise and fan out, each is stamped PASS — and its
 * scan line keeps passing over the stack (CSS, only while on screen). On the
 * pinned layout that figure lives in the engine's ring, and the stage's
 * overlay plays it when the work's beat arrives.
 */
import { createTimeline, cubicBezier, stagger } from "@/lib/motion/anime/core";
import type { ChapterContext, ChapterMotion } from "@/lib/motion/chapter";
import { countUp } from "@/lib/motion/countup";
import { EASE_OUT_EXPO, STAGGER } from "@/lib/motion/tokens";

const expo = cubicBezier(...EASE_OUT_EXPO);
/** Gap between fanned sheets, px along the stack's Z axis. */
const FAN = 34;

export default function buildCases({ root, desktop }: ChapterContext): ChapterMotion {
  const all = <T extends Element>(sel: string) => Array.from(root.querySelectorAll<T>(sel));
  const counters = all<HTMLElement>("[data-countup]");

  const tl = createTimeline({ autoplay: false, defaults: { ease: expo } });
  if (!desktop) {
    const docs = all<HTMLElement>(".cases-figure .doc");
    docs.forEach((doc, k) => {
      tl.add(doc, { opacity: [0, 1], translateZ: [0, k * FAN], translateY: [40, 0], duration: 800 }, 150 + k * STAGGER.block);
    });
    tl.add(all(".cases-figure .doc-stamp"), { opacity: [0, 1], scale: [1.8, 1], duration: 360, delay: stagger(STAGGER.block) }, 900);
  }

  const count = { p: 0 };
  tl.add(
    count,
    {
      p: [0, 1],
      duration: 1200,
      ease: "out(3)",
      onUpdate: () => {
        for (const el of counters) el.textContent = countUp(el.dataset.countup ?? "", count.p);
      },
      onComplete: () => {
        for (const el of counters) el.textContent = el.dataset.countup ?? "";
      },
    },
    400,
  );

  const ambient = {
    play: () => root.classList.add("is-ambient"),
    pause: () => root.classList.remove("is-ambient"),
  };

  return {
    timeline: tl,
    ambient,
    dispose: () => {
      root.classList.remove("is-ambient");
      for (const el of counters) el.textContent = el.dataset.countup ?? "";
    },
  };
}
