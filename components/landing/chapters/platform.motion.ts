/**
 * §02 Platform — the stack compresses into place. Scrubbed across the pinned
 * run on desktop; played once on phones. Every plate translates home from its
 * exploded offset while the leader lines feeding it draw in; a plate "locks"
 * (class + counter, written only on change) when it lands.
 */
import { createTimeline, cubicBezier } from "@/lib/motion/anime/core";
import type { ChapterContext, ChapterMotion } from "@/lib/motion/chapter";
import { LAYERS, plateOffset } from "@/lib/landing/platform-geometry";
import { EASE_CAMERA } from "@/lib/motion/tokens";

const camera = cubicBezier(...EASE_CAMERA);

/** Timeline units (the scrub maps the pinned run onto 0 → 1000). */
const DURATION = 1000;
const start = (i: number) => 80 + i * 120;
const LAND = 380;
const landed = (i: number) => start(i) + LAND;

export default function buildPlatform({ root, desktop }: ChapterContext): ChapterMotion {
  const plates = Array.from(root.querySelectorAll<SVGGElement>("[data-plate]"));
  const leaders = Array.from(root.querySelectorAll<SVGPathElement>(".leader"));
  const bus = root.querySelector<SVGPathElement>(".platform-bus");
  const rows = Array.from(root.querySelectorAll<HTMLElement>(".platform-layer"));
  const labels = Array.from(root.querySelectorAll<HTMLElement>(".discipline"));
  const count = root.querySelector<HTMLElement>("[data-count]");

  // Locks: written only when the number of landed plates changes.
  let locked = -1;
  const setLocked = (n: number) => {
    if (n === locked) return;
    locked = n;
    for (let i = 0; i < LAYERS; i++) {
      const on = i < n;
      plates.find((p) => p.dataset.plate === String(i))?.classList.toggle("is-locked", on);
      rows[i]?.classList.toggle("is-locked", on);
    }
    labels.forEach((l) => l.classList.toggle("is-lit", Number(l.dataset.layer) < n));
    if (count) count.textContent = String(n).padStart(2, "0");
  };

  // Phones play this once; `onComplete`, not `.then()` — anime 4.5 keeps a
  // single then-callback per timeline, and MotionChapter's own `.then()`
  // (which marks the chapter done) would silently replace this one.
  const timeline = createTimeline({
    autoplay: false,
    defaults: { ease: camera },
    onComplete: desktop ? undefined : () => setLocked(LAYERS),
  });
  for (let i = 0; i < LAYERS; i++) {
    const plate = plates.find((p) => p.dataset.plate === String(i));
    if (plate) timeline.add(plate, { translateY: [plateOffset(i), 0], duration: LAND }, start(i));
    const lines = leaders.filter((l) => l.dataset.layer === String(i));
    if (lines.length) timeline.add(lines, { strokeDashoffset: [1, 0], duration: LAND, ease: "out(2)" }, start(i));
  }
  if (bus) timeline.add(bus, { strokeDashoffset: [1, 0], duration: DURATION - landed(LAYERS - 1) }, landed(LAYERS - 1));

  const reset = () => setLocked(LAYERS);

  if (!desktop) {
    // Phones: a short settle as the chapter enters; everything ends locked.
    timeline.seek(0);
    setLocked(0);
    return { mode: "once", timeline, dispose: reset };
  }

  return {
    timeline,
    smooth: { tauMs: 140 },
    onProgress: (_p, time) => {
      let n = 0;
      while (n < LAYERS && time >= landed(n)) n++;
      setLocked(n);
    },
    dispose: reset,
  };
}
