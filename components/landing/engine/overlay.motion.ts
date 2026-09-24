/**
 * The stage's overlays, built when their beat arrives: each capability's demo
 * inside the ring, and the work's controlled documents fanning out and being
 * stamped. Lazy (anime stays out of the first load); every timeline animates
 * FROM a draft state to the server-rendered built one, so a timeline that
 * never loads — or is completed at once — leaves the finished drawing.
 */
import { createTimeline, cubicBezier, stagger, type Timeline } from "@/lib/motion/anime/core";
import { DESIGN_DEMO, PIPELINE_DEMO, PRODUCT_DEMO } from "@/lib/landing/demo-geometry";
import { EASE_CAMERA, EASE_OUT_EXPO, STAGGER } from "@/lib/motion/tokens";

const camera = cubicBezier(...EASE_CAMERA);
const expo = cubicBezier(...EASE_OUT_EXPO);
/** Gap between fanned sheets, px along the stack's Z axis. */
const FAN = 22;

/** Capability `i`'s demo, building itself (~1s). */
export function demoTimeline(stage: Element, i: number): Timeline | null {
  const demo = stage.querySelector<SVGGElement>(`[data-demo="${i}"]`);
  if (!demo) return null;
  const q = <T extends Element>(sel: string) => Array.from(demo.querySelectorAll<T>(sel));
  const tl = createTimeline({ autoplay: false, defaults: { ease: camera } });

  if (i === 0) {
    for (let l = 0; l < 4; l++) {
      tl.add(q(`.demo-node[data-l="${l}"]`), { scale: [0, 1], duration: 160, delay: stagger(24) }, 60 + l * 70);
    }
    for (let l = 0; l < 3; l++) {
      tl.add(q(`.demo-edge[data-l="${l}"]`), { strokeDashoffset: [1, 0], duration: 220, delay: stagger(5) }, 140 + l * 90);
    }
    tl.add(q(".demo-signal"), { strokeDashoffset: [1, 0], duration: 260 }, 460);
    tl.add(q(".demo-gate"), { opacity: [0.3, 1], duration: 140 }, 700);
    tl.add(q(".demo-check"), { strokeDashoffset: [1, 0], duration: 160 }, 720);
    return tl;
  }

  if (i === 1) {
    const { frame, blocks } = PRODUCT_DEMO;
    tl.add(q("[data-block]"), { opacity: [0, 1], duration: 160, delay: stagger(40) }, 80);
    tl.add(q("[data-notch]"), { opacity: [1, 0], duration: 120 }, 460);
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
      480,
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
        500 + k * 18,
      );
    });
    return tl;
  }

  if (i === 2) {
    const trace = q<SVGPathElement>("[data-trace]");
    tl.add(trace, { strokeDashoffset: [1, 0], duration: 280, ease: "out(2)" }, 60);
    tl.add(trace, { d: [DESIGN_DEMO.tangle, DESIGN_DEMO.circuit], duration: 420 }, 380);
    tl.add(q(".demo-pad"), { opacity: [0, 1], scale: [0.2, 1], duration: 160, delay: stagger(30) }, 760);
    tl.add(q("[data-before]"), { opacity: [1, 0], duration: 120 }, 700);
    tl.add(q("[data-after]"), { opacity: [0, 1], duration: 160 }, 780);
    return tl;
  }

  // i === 3: a change travels the pipeline, stopping at each station.
  const { stops } = PIPELINE_DEMO;
  const stations = q<SVGGElement>(".demo-station");
  tl.add(q(".demo-rail"), { strokeDashoffset: [1, 0], duration: 240 }, 60);
  tl.set(stations, { opacity: 0.35 }, 0);
  stops.forEach((x, k) => {
    const at = 220 + k * 150;
    if (k > 0) tl.add(q("[data-packet]"), { cx: [stops[k - 1], x], duration: 110 }, at - 110);
    if (stations[k]) tl.add(stations[k], { opacity: [0.35, 1], duration: 90 }, at);
  });
  tl.add(q("[data-pulse]"), { r: [10, 46], opacity: [0.9, 0], duration: 260, ease: "out(2)" }, 700);
  return tl;
}

/** The work: controlled documents rise and fan out, then each is stamped PASS. */
export function docsTimeline(root: Element): Timeline | null {
  const docs = Array.from(root.querySelectorAll<HTMLElement>(".doc"));
  if (!docs.length) return null;
  const stamps = Array.from(root.querySelectorAll<HTMLElement>(".doc-stamp"));
  const tl = createTimeline({ autoplay: false, defaults: { ease: expo } });
  docs.forEach((doc, k) => {
    tl.add(doc, { opacity: [0, 1], translateZ: [0, k * FAN], translateY: [40, 0], duration: 800 }, 80 + k * STAGGER.block);
  });
  tl.add(stamps, { opacity: [0, 1], scale: [1.8, 1], duration: 360, delay: stagger(STAGGER.block) }, 820);
  return tl;
}
