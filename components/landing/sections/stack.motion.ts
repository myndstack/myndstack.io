import { createTimeline } from "@/lib/motion/anime/core";
import type { ChapterBuilder } from "@/lib/motion/chapter";
import { activeIndex } from "@/lib/motion/progress";

/** Each layer builds across this share of the chapter; they overlap a little. */
const LAYER_SPAN = 0.26;
/** Where each layer's build starts, as a fraction of the chapter. */
const layerStart = (k: number, count: number): number => (k * (1 - LAYER_SPAN)) / Math.max(1, count - 1);
/** A layer counts as locked once its build is this far along. */
const LOCK_AT = 0.7;

/**
 * FIG.03 stack, scrubbed. A timeline of 1000 units, seeked from scroll (never
 * played): per layer the dashed draft gains its solid surface, the lock bar
 * lights top-down, and the bus segment above it draws. Linear on purpose — the
 * scroll IS the easing; an eased scrub feels like lag.
 *
 * onProgress only flips `is-locked` and the "01 / 04" counter when they change.
 */
const buildStack: ChapterBuilder = ({ root, desktop }) => {
  const layers = [...root.querySelectorAll<HTMLElement>("[data-layer]")];
  const counter = root.querySelector<HTMLElement>("[data-stack-counter]");
  const bus = root.querySelector<SVGPathElement>("[data-bus]");
  const count = layers.length;
  const total = String(count).padStart(2, "0");

  const timeline = createTimeline({ autoplay: false, defaults: { ease: "linear" } });

  layers.forEach((layer, k) => {
    const at = layerStart(k, count) * 1000;
    const span = LAYER_SPAN * 1000;
    const surface = layer.querySelector(".bp-solid:not([data-lock])");
    const lock = layer.querySelector("[data-lock]");
    if (surface) timeline.add(surface, { opacity: [0, 1], duration: span * 0.6 }, at);
    if (lock) timeline.add(lock, { opacity: [0, 1], scaleY: [0, 1], duration: span * 0.5 }, at + span * 0.4);
  });
  if (bus) timeline.add(bus, { strokeDashoffset: [1, 0], duration: 1000 }, 0);

  // The server renders every layer locked (the built state); the scrub owns it now.
  const lockedStops = layers.map((_, k) => layerStart(k, count) + LAYER_SPAN * LOCK_AT);
  let lastLocked = -1;
  let lastCounter = "";

  const onProgress = (p: number) => {
    let locked = 0;
    for (const stop of lockedStops) if (p >= stop) locked++;
    if (p >= 1) locked = count;
    if (locked !== lastLocked) {
      lastLocked = locked;
      layers.forEach((layer, k) => layer.classList.toggle("is-locked", k < locked));
    }
    const current = String(activeIndex(p, [0, ...lockedStops.slice(0, -1)]) + 1).padStart(2, "0");
    const text = `${current} / ${total}`;
    if (counter && text !== lastCounter) {
      lastCounter = text;
      counter.dataset.count = text;
    }
  };

  return { timeline, range: desktop ? "pinned" : "pass", onProgress };
};

export default buildStack;
