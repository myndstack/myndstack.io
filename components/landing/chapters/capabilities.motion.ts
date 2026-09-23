/**
 * Run B — the capabilities. One master timeline, segments:
 *   enter (the run rising into view) · cap 1–4 · finale
 * Each capability lights its arc and glow, turns the playhead to it, fades in
 * its wash, demo and spec panel, and builds the demo; the finale lights the
 * whole spectrum, then turns the ring edge-on (a line) and hands over to a
 * spectral bar that spans the page. Scrubbed on the pinned
 * layout only — on the static layout this run has no stage at all.
 *
 * Targets are disjoint from anything else that animates (there is no intro or
 * lean here), and each property on each target is tweened in time order.
 */
import { createTimeline, cubicBezier, stagger, type Timeline } from "@/lib/motion/anime/core";
import type { ChapterContext, ChapterMotion } from "@/lib/motion/chapter";
import { CORE } from "@/lib/motion/core-geometry";
import { SEGMENT_UNIT } from "@/lib/motion/segments";
import { EASE_CAMERA } from "@/lib/motion/tokens";
import { CAPABILITY_HUES } from "@/lib/landing/chapters";
import { DESIGN_DEMO, PIPELINE_DEMO, PRODUCT_DEMO } from "@/lib/landing/demo-geometry";

import { mountField } from "../core/field-canvas";

const camera = cubicBezier(...EASE_CAMERA);
const U = SEGMENT_UNIT;
/** Dim level of an arc whose chapter hasn't come (or has gone). */
const DIM = 0.2;
const PAST = 0.55;

export default function buildCapabilities({ root, desktop, coarse }: ChapterContext): ChapterMotion {
  if (!desktop) {
    // Static layout: nothing pinned, nothing to scrub — the articles carry
    // their own rings. An empty once-timeline just marks the chapter done.
    return { mode: "once", timeline: createTimeline({ autoplay: false }) };
  }

  const one = <T extends Element>(sel: string) => root.querySelector<T>(sel);
  const all = <T extends Element>(sel: string) => Array.from(root.querySelectorAll<T>(sel));
  const stage = one<HTMLElement>("[data-stage]");
  const core3d = one<HTMLElement>("[data-core-3d]");
  const arcs = all<SVGPathElement>("[data-stage] .core-arc");
  const glows = all<HTMLElement>("[data-stage] .core-glow");
  const playhead = one<SVGGElement>("[data-stage] [data-core-playhead]");
  const chrome = [
    one("[data-stage] .core-ticks"),
    one("[data-stage] .core-track"),
    one("[data-stage] .core-inner"),
    one("[data-stage] .core-cross"),
    one("[data-stage] .core-dot"),
  ].filter((el): el is Element => el !== null);
  const demos = all<SVGGElement>("[data-demo]");
  const panels = all<HTMLElement>("[data-panel]");
  const washes = all<HTMLElement>("[data-wash]");
  const fieldBox = one<HTMLElement>("[data-core-field]");
  const bar = one<HTMLElement>("[data-caps-bar]");
  const count = Math.min(CAPABILITY_HUES.length, all("[data-cap]").length);
  const finale = (count + 1) * U;

  const tl = createTimeline({ autoplay: false, defaults: { ease: camera } });

  // Baseline at t=0 (a seek before a property's first tween shows these).
  tl.set(arcs, { opacity: DIM }, 0)
    .set(glows, { opacity: 0 }, 0)
    .set([...demos, ...panels, ...washes], { opacity: 0 }, 0);

  // --- enter: rise from behind the paper ------------------------------------
  if (core3d) tl.add(core3d, { y: ["52%", "0%"], rotateX: [58, 0], scale: [0.72, 1], duration: U }, 0);

  // --- chapters ------------------------------------------------------------
  let prevAngle = 0;
  for (let i = 0; i < count; i++) {
    const s = (i + 1) * U;
    const arc = arcs[i + 1];
    const glow = glows[i + 1];
    const mid = CORE.arcs[i + 1].mid;
    const last = i === count - 1;
    const out = last ? finale : s + U;

    if (arc) tl.add(arc, { opacity: [DIM, 1], duration: 300 }, s);
    if (glow) tl.add(glow, { opacity: [0, 1], duration: 300 }, s);
    if (playhead) tl.add(playhead, { rotate: [prevAngle, mid], duration: 420 }, s);
    prevAngle = mid;
    if (washes[i]) tl.add(washes[i], { opacity: [0, 1], duration: 320 }, s);
    if (panels[i]) tl.add(panels[i], { opacity: [0, 1], y: [18, 0], duration: 260 }, s + 40);
    if (demos[i]) tl.add(demos[i], { opacity: [0, 1], duration: 200 }, s + 40);
    if (demos[i]) buildDemo(tl, demos[i], i, s);

    // Leaving: the demo and panel fade late in the chapter; the arc stays
    // half-lit (the spectrum accumulates), the wash hands over.
    if (demos[i]) tl.add(demos[i], { opacity: [1, 0], duration: 150 }, out - 150);
    if (panels[i]) tl.add(panels[i], { opacity: [1, 0], duration: 150 }, out - 150);
    if (!last) {
      if (arc) tl.add(arc, { opacity: [1, PAST], duration: 300 }, out);
      if (glow) tl.add(glow, { opacity: [1, 0.2], duration: 300 }, out);
    }
    if (washes[i]) tl.add(washes[i], { opacity: [1, 0], duration: 300 }, out);
  }

  // --- finale: the full spectrum, then edge-on into the bar ----------------
  tl.add(arcs, { opacity: 1, duration: 300 }, finale);
  tl.add(glows, { opacity: 1, duration: 300 }, finale);
  if (playhead) tl.add(playhead, { rotate: [prevAngle, 360], duration: 420 }, finale);
  tl.add([...chrome, ...(playhead ? [playhead] : [])], { opacity: [1, 0], duration: 200 }, finale + 460);
  tl.add(glows, { opacity: [1, 0], duration: 220 }, finale + 460);
  if (fieldBox) tl.add(fieldBox, { opacity: [1, 0], duration: 260 }, finale + 420);
  if (core3d) tl.add(core3d, { x: ["0vw", "-14vw"], rotateX: [0, 90], duration: 380 }, finale + 460);
  if (bar) {
    tl.set(bar, { opacity: 0, scaleX: 0.36 }, 0);
    tl.add(bar, { opacity: [0, 1], duration: 80 }, finale + 800);
    tl.add(bar, { scaleX: [0.36, 1], duration: 200, ease: "out(3)" }, finale + 800);
  }
  // The edge-on ring hands over to the bar.
  tl.add(arcs, { opacity: [1, 0], duration: 100 }, finale + 800);
  // Pad so the timeline is exactly (count + 2) segments long.
  tl.add({ duration: 1 }, (count + 2) * U - 1);

  const field = fieldBox ? mountField(fieldBox, { seed: 29, wave: false, coarse, density: 0.4 }) : null;

  // State for tests and CSS, written only on change.
  let shown = "";
  const setState = (active: number, complete: boolean) => {
    const key = `${active}|${complete}`;
    if (key === shown) return;
    shown = key;
    root.dataset.capActive = String(active);
    root.dataset.hue = active >= 0 && active < count ? CAPABILITY_HUES[active] : active === count ? "spectrum" : "";
    if (complete) root.dataset.complete = "true";
    else delete root.dataset.complete;
    stage?.setAttribute("data-phase", active < 0 ? "enter" : active < count ? "chapter" : "finale");
  };

  return {
    timeline: tl,
    segmented: { enter: true, lead: 0.5 },
    smooth: { tauMs: coarse ? 80 : 140 },
    ambient: field ?? undefined,
    onProgress: (_p, time) => {
      const seg = Math.floor(time / U);
      const active = time < U ? -1 : Math.min(count, seg - 1);
      setState(active, time >= finale + 300);
      field?.setEnergy(time < finale + 450 ? 0.55 : 0);
    },
    dispose: () => {
      field?.dispose();
      delete root.dataset.capActive;
      delete root.dataset.hue;
      delete root.dataset.complete;
      stage?.removeAttribute("data-phase");
    },
  };
}

/** Each demo's own build, inside its chapter (local time from `s`). */
function buildDemo(tl: Timeline, demo: SVGGElement, i: number, s: number): void {
  const q = <T extends Element>(sel: string) => Array.from(demo.querySelectorAll<T>(sel));

  if (i === 0) {
    for (let l = 0; l < 4; l++) {
      tl.add(q(`.demo-node[data-l="${l}"]`), { scale: [0, 1], duration: 160, delay: stagger(24) }, s + 60 + l * 70);
    }
    for (let l = 0; l < 3; l++) {
      tl.add(q(`.demo-edge[data-l="${l}"]`), { strokeDashoffset: [1, 0], duration: 220, delay: stagger(5) }, s + 140 + l * 90);
    }
    tl.add(q(".demo-signal"), { strokeDashoffset: [1, 0], duration: 260 }, s + 460);
    tl.add(q(".demo-gate"), { opacity: [0.3, 1], duration: 140 }, s + 700);
    tl.add(q(".demo-check"), { strokeDashoffset: [1, 0], duration: 160 }, s + 720);
    return;
  }

  if (i === 1) {
    const { frame, blocks } = PRODUCT_DEMO;
    tl.add(q("[data-block]"), { opacity: [0, 1], duration: 160, delay: stagger(40) }, s + 80);
    tl.add(q("[data-notch]"), { opacity: [1, 0], duration: 120 }, s + 460);
    tl.add(
      q("[data-frame]"),
      {
        x: [frame.phone.x, frame.desktop.x],
        y: [frame.phone.y, frame.desktop.y],
        width: [frame.phone.w, frame.desktop.w],
        height: [frame.phone.h, frame.desktop.h],
        rx: [22, 10],
        duration: 360,
      },
      s + 480,
    );
    blocks.forEach((b, k) => {
      tl.add(
        q(`[data-block="${b.id}"]`),
        {
          x: [b.phone.x, b.desktop.x],
          y: [b.phone.y, b.desktop.y],
          width: [b.phone.w, b.desktop.w],
          height: [b.phone.h, b.desktop.h],
          duration: 360,
        },
        s + 500 + k * 18,
      );
    });
    return;
  }

  if (i === 2) {
    const trace = q<SVGPathElement>("[data-trace]");
    tl.add(trace, { strokeDashoffset: [1, 0], duration: 280, ease: "out(2)" }, s + 60);
    tl.add(trace, { d: [DESIGN_DEMO.tangle, DESIGN_DEMO.circuit], duration: 420 }, s + 380);
    tl.add(q(".demo-pad"), { opacity: [0, 1], scale: [0.2, 1], duration: 160, delay: stagger(30) }, s + 760);
    tl.add(q("[data-before]"), { opacity: [1, 0], duration: 120 }, s + 700);
    tl.add(q("[data-after]"), { opacity: [0, 1], duration: 160 }, s + 780);
    return;
  }

  // i === 3: a change travels the pipeline, stopping at each station.
  const { stops } = PIPELINE_DEMO;
  const stations = q<SVGGElement>(".demo-station");
  tl.add(q(".demo-rail"), { strokeDashoffset: [1, 0], duration: 240 }, s + 60);
  tl.set(stations, { opacity: 0.35 }, s);
  stops.forEach((x, k) => {
    const at = s + 220 + k * 150;
    if (k > 0) tl.add(q("[data-packet]"), { cx: [stops[k - 1], x], duration: 110 }, at - 110);
    if (stations[k]) tl.add(stations[k], { opacity: [0.35, 1], duration: 90 }, at);
  });
  tl.add(q("[data-pulse]"), { r: [10, 46], opacity: [0.9, 0], duration: 260, ease: "out(2)" }, s + 700);
}
