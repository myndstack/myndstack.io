/**
 * §05 — the steps slide past on a horizontal track as the page scrolls. Pure
 * transforms in vw (the track's width is known from the step count, so nothing
 * is measured), the rail fills with scaleX, each glyph draws as its step
 * reaches the middle, and stops light on change only. Pinned layout only —
 * the static layouts are CSS (grid / snap carousel).
 */
import { createTimeline } from "@/lib/motion/anime/core";
import type { ChapterContext, ChapterMotion } from "@/lib/motion/chapter";

/** Panel width + gap, in vw — must match `.step` in styles/process.css. */
const PANEL_VW = 42;
/** The page column's visible width, in vw (margins are ~5vw each side). */
const VISIBLE_VW = 90;

export default function buildProcess({ root, desktop }: ChapterContext): ChapterMotion {
  if (!desktop) return { mode: "once", timeline: createTimeline({ autoplay: false }) };

  const track = root.querySelector<HTMLElement>("[data-track]");
  const fill = root.querySelector<HTMLElement>("[data-rail-fill]");
  const stops = Array.from(root.querySelectorAll<HTMLElement>("[data-stop]"));
  const glyphs = Array.from(root.querySelectorAll<SVGPathElement>(".step-glyph path"));
  const n = stops.length;
  const shift = Math.max(0, n * PANEL_VW - 2 - VISIBLE_VW);

  const tl = createTimeline({ autoplay: false, defaults: { ease: "linear" } });
  if (track) tl.add(track, { x: ["0vw", `-${shift}vw`], duration: 1000 }, 0);
  if (fill) tl.add(fill, { scaleX: [0, 1], duration: 1000 }, 0);
  glyphs.forEach((glyph, i) => {
    const at = n > 1 ? (i / (n - 1)) * 820 : 0;
    tl.add(glyph, { strokeDashoffset: [1, 0], duration: 180, ease: "out(2)" }, Math.max(0, at - 60));
  });

  let lit = -1;
  const setLit = (count: number) => {
    if (count === lit) return;
    lit = count;
    stops.forEach((stop, i) => stop.classList.toggle("is-lit", i < count));
  };

  return {
    timeline: tl,
    smooth: { tauMs: 140 },
    onProgress: (p) => {
      let count = 0;
      while (count < n && p >= (n > 1 ? (count / (n - 1)) * 0.98 : 0)) count++;
      setLit(count);
    },
    dispose: () => setLit(n),
  };
}
