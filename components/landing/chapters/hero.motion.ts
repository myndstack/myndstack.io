/**
 * §01 — the intro, played once: the Core's tick sweep and arcs draw on and its
 * glow comes up, the headline decodes left to right ("end to end." last) and,
 * on the pinned layout, the copy rises in.
 *
 * The Core it draws is whichever one the hero is showing: the stage's ring
 * (pinned) or the hero's own slot (the static layout's horizon). Nothing here
 * scrubs — the engine's director owns everything scroll does. Composition
 * 'none': these targets are never animated by anything else.
 */
import { createTimeline, cubicBezier, stagger } from "@/lib/motion/anime/core";
import type { ChapterContext, ChapterMotion } from "@/lib/motion/chapter";
import { scrambleFrame } from "@/lib/motion/scramble";
import { EASE_OUT_EXPO, STAGGER } from "@/lib/motion/tokens";

const expo = cubicBezier(...EASE_OUT_EXPO);

export default function buildHero({ root, desktop }: ChapterContext): ChapterMotion {
  const face = desktop
    ? document.querySelector<HTMLElement>('[data-engine-stage] [data-poster="face-ring"]')
    : root.querySelector<HTMLElement>(".engine-slot--hero");
  const all = <T extends Element>(scope: ParentNode | null, sel: string) =>
    scope ? Array.from(scope.querySelectorAll<T>(sel)) : [];

  const sweep = face?.querySelector<SVGPathElement>(".core-sweep") ?? null;
  const arcs = all<SVGPathElement>(face, ".core-arc");
  const glowInner = all<HTMLElement>(face, ".core-glow-inner");
  const decoders = all<HTMLElement>(root, "[data-decode]");
  const rise = all<HTMLElement>(root, "[data-rise]");

  const intro = createTimeline({ autoplay: false, defaults: { composition: "none" } });
  if (sweep) intro.add(sweep, { strokeDashoffset: [1, 0], duration: 620, ease: "inOut(2)" }, 120);
  if (arcs.length) intro.add(arcs, { strokeDashoffset: [1, 0], duration: 720, ease: expo, delay: stagger(STAGGER.arc) }, 300);
  if (glowInner.length) {
    intro.add(glowInner, { opacity: [0, 1], duration: 900, ease: "out(2)", delay: stagger(STAGGER.arc) }, 380);
  }

  // The decode: each overlay line resolves left to right; "end to end." last.
  decoders.forEach((el, i) => {
    const text = el.dataset.decode ?? "";
    const seed = 17 + i * 31;
    const state = { p: 0 };
    el.textContent = scrambleFrame(text, 0, seed);
    intro.add(
      state,
      {
        p: [0, 1],
        duration: 600,
        ease: "out(2)",
        onUpdate: () => {
          el.textContent = scrambleFrame(text, state.p, seed);
        },
      },
      450 + i * 160,
    );
  });

  if (desktop && rise.length) {
    intro.add(rise, { opacity: [0, 1], y: [12, 0], duration: 520, ease: expo, delay: stagger(STAGGER.list) }, 900);
  }

  return { mode: "once", timeline: intro };
}
