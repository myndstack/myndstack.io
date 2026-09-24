/**
 * §05 — the steps slide past on a horizontal track as the page scrolls. The
 * scrub writes one number, the track's `--p` (0 → 1); how far that moves it is
 * CSS (`--shift`, from the card size and the site column), so nothing is
 * measured. The rail fills with scaleX, each glyph draws as its step reaches
 * the middle (the first starts drawn), and stops light on change only. Pinned
 * layout only — the static layouts are CSS (grid / snap carousel).
 */
import { createTimeline } from "@/lib/motion/anime/core";
import type { ChapterContext, ChapterMotion } from "@/lib/motion/chapter";

export default function buildProcess({ root, desktop }: ChapterContext): ChapterMotion {
  if (!desktop) return { mode: "once", timeline: createTimeline({ autoplay: false }) };

  const track = root.querySelector<HTMLElement>("[data-track]");
  const fill = root.querySelector<HTMLElement>("[data-rail-fill]");
  const stops = Array.from(root.querySelectorAll<HTMLElement>("[data-stop]"));
  const glyphs = Array.from(root.querySelectorAll<SVGPathElement>(".step-glyph path"));
  const n = stops.length;

  const tl = createTimeline({ autoplay: false, defaults: { ease: "linear" } });
  if (track) tl.add(track, { "--p": [0, 1], duration: 1000 }, 0);
  if (fill) tl.add(fill, { scaleX: [0, 1], duration: 1000 }, 0);
  // The first step is on screen from the start, so its glyph starts drawn.
  glyphs.slice(1).forEach((glyph, k) => {
    const at = n > 1 ? ((k + 1) / (n - 1)) * 820 : 0;
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
