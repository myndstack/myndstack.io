/**
 * Run A — the hero and the dive. Two timelines that never share a target +
 * property (anime's default `replace` composition would cancel one of them):
 *
 * - `intro` (plays once, at the top of the page): the tick sweep mask, the
 *   arcs' dash offsets, the glow INNER layers, the h1 decode overlay and the
 *   flow copy rising in. Composition 'none'.
 * - `timeline` (scrubbed, segments hero → dive): the camera on
 *   `[data-core-3d]`, the wash, the glow OUTER layers and the tick group.
 *
 * The pointer lean lives on `[data-core-lean]`, a third element.
 * Phones (no pin): the intro alone, played once.
 */
import { createAnimatable } from "@/lib/motion/anime/animatable";
import { createTimeline, cubicBezier, stagger } from "@/lib/motion/anime/core";
import type { ChapterContext, ChapterMotion } from "@/lib/motion/chapter";
import { scrambleFrame } from "@/lib/motion/scramble";
import { SEGMENT_UNIT } from "@/lib/motion/segments";
import { EASE_CAMERA, EASE_OUT_EXPO, STAGGER } from "@/lib/motion/tokens";

import { mountField } from "../core/field-canvas";

const expo = cubicBezier(...EASE_OUT_EXPO);
const camera = cubicBezier(...EASE_CAMERA);
const U = SEGMENT_UNIT;

/** How far the pointer tilts the Core, in degrees. */
const LEAN_DEG = 5;

export default function buildHero({ root, desktop, coarse }: ChapterContext): ChapterMotion {
  const one = <T extends Element>(sel: string) => root.querySelector<T>(sel);
  const all = <T extends Element>(sel: string) => Array.from(root.querySelectorAll<T>(sel));

  const core3d = one<HTMLElement>("[data-core-3d]");
  const lean = one<HTMLElement>("[data-core-lean]");
  const wash = one<HTMLElement>("[data-core-wash]");
  const fieldBox = one<HTMLElement>("[data-core-field]");
  const sweep = one<SVGPathElement>(".core-sweep");
  const arcs = all<SVGPathElement>(".core-arc");
  const glowOuter = all<HTMLElement>(".core-glow");
  const glowInner = all<HTMLElement>(".core-glow-inner");
  const ticks = one<SVGGElement>(".core-ticks");
  const decoders = all<HTMLElement>("[data-decode]");
  const rise = all<HTMLElement>("[data-rise]");

  // --- intro -------------------------------------------------------------
  const intro = createTimeline({ autoplay: false, defaults: { composition: "none" } });
  if (sweep) intro.add(sweep, { strokeDashoffset: [1, 0], duration: 620, ease: "inOut(2)" }, 120);
  intro.add(arcs, { strokeDashoffset: [1, 0], duration: 720, ease: expo, delay: stagger(STAGGER.arc) }, 300);
  intro.add(glowInner, { opacity: [0, 1], duration: 900, ease: "out(2)", delay: stagger(STAGGER.arc) }, 380);

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

  // --- particle field ------------------------------------------------------
  const field = fieldBox ? mountField(fieldBox, { seed: 11, wave: true, coarse }) : null;

  // Phones: no pinned camera — the intro is the whole show, played once.
  if (!desktop) {
    return {
      mode: "once",
      timeline: intro,
      ambient: field ?? undefined,
      dispose: () => field?.dispose(),
    };
  }

  // --- scrubbed camera: hero (0 → U), dive (U → 2U) -------------------------
  const timeline = createTimeline({ autoplay: false, defaults: { ease: camera } });
  if (core3d) {
    timeline
      .add(core3d, { rotateX: [0, 14], scale: [1, 0.92], y: ["0%", "8%"], duration: U, ease: "linear" }, 0)
      .add(
        core3d,
        { rotateX: [14, 68], scale: [0.92, 0.6], y: ["8%", "46%"], x: ["0vw", "-17vw"], duration: U },
        U,
      );
  }
  if (wash) timeline.add(wash, { opacity: [1, 0.35], duration: U }, U);
  if (glowOuter.length) timeline.add(glowOuter, { opacity: [1, 0.3], duration: U }, U);
  if (ticks) timeline.add(ticks, { opacity: [1, 0.45], duration: U }, U);
  // Pad to exactly two segments so time maps 1:1 onto the segment unit.
  timeline.add({ duration: 1 }, 2 * U - 1);

  // --- pointer lean (fine pointers only) -----------------------------------
  let onPointer: ((e: PointerEvent) => void) | null = null;
  let onResize: (() => void) | null = null;
  if (lean && !coarse) {
    const tilt = createAnimatable(lean, { rotateX: 900, rotateY: 900, ease: "out(3)" });
    let vw = window.innerWidth;
    let vh = window.innerHeight;
    onResize = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
    };
    onPointer = (e) => {
      const nx = (e.clientX / vw - 0.5) * 2;
      const ny = (e.clientY / vh - 0.5) * 2;
      tilt.rotateY(nx * LEAN_DEG);
      tilt.rotateX(-ny * LEAN_DEG * 0.8);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
  }

  return {
    timeline,
    segmented: {},
    smooth: { tauMs: coarse ? 80 : 140 },
    intro,
    ambient: field ?? undefined,
    onProgress: (_p, time) => {
      // The field thins out as the Core dives under the curtain, then parks.
      field?.setEnergy(time <= U ? 1 : Math.max(0, 1 - (time - U) / (U * 0.9)));
    },
    dispose: () => {
      if (onPointer) window.removeEventListener("pointermove", onPointer);
      if (onResize) window.removeEventListener("resize", onResize);
      field?.dispose();
    },
  };
}
