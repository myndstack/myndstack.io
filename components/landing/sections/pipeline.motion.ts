import { createTimeline } from "@/lib/motion/anime/core";
import type { ChapterBuilder } from "@/lib/motion/chapter";
import { countUp } from "@/lib/motion/countup";
import { pipelineGeometry } from "@/lib/motion/pipeline-geometry";
import { segment } from "@/lib/motion/progress";

import { PIPELINE_BOX, PIPELINE_STAGES } from "@/lib/landing/content";

/** The document travels across this window of the chapter… */
const TRAVEL_START = 0.05;
const TRAVEL_END = 0.82;
/** …then the metrics count up across this one. */
const COUNT_START = 0.84;

/**
 * FIG.04 pipeline, scrubbed (1000 units, never played). The document glyph is
 * translated along the analytically computed path — the same geometry the
 * server drew, so no DOM measuring — while the progress line draws behind it.
 * Each stage builds (dashed → solid) the moment the glyph reaches it; gates
 * stamp PASS. After APPROVED, the case's real metrics count up.
 */
const buildPipeline: ChapterBuilder = ({ root, desktop }) => {
  const layout = desktop ? "row" : "column";
  const svg = root.querySelector<SVGSVGElement>(`[data-pipeline="${layout}"]`);
  const geometry = pipelineGeometry(
    PIPELINE_STAGES.map((s) => s.id),
    layout,
    PIPELINE_BOX[layout],
  );
  const first = geometry.nodes[0];
  const last = geometry.nodes[geometry.nodes.length - 1];

  const timeline = createTimeline({ autoplay: false, defaults: { ease: "linear" } });
  const at = (fraction: number) => fraction * 1000;
  const travel = (t: number) => at(TRAVEL_START + t * (TRAVEL_END - TRAVEL_START));

  const progressLine = svg?.querySelector("[data-progress]");
  const glyph = svg?.querySelector("[data-glyph]");
  if (progressLine) {
    timeline.add(progressLine, { strokeDashoffset: [1, 0], duration: travel(1) - travel(0) }, travel(0));
  }
  if (glyph) {
    timeline.add(
      glyph,
      layout === "row"
        ? { x: [0, last.x - first.x], duration: travel(1) - travel(0) }
        : { y: [0, last.y - first.y], duration: travel(1) - travel(0) },
      travel(0),
    );
  }

  geometry.nodes.forEach((node) => {
    const group = svg?.querySelector(`[data-node="${node.id}"]`);
    if (!group) return;
    const built = group.querySelectorAll("[data-built]");
    const stamp = group.querySelector("[data-stamp]");
    const reached = travel(node.t);
    if (built.length) timeline.add(built, { opacity: [0, 1], duration: 40 }, Math.max(0, reached - 10));
    if (stamp) timeline.add(stamp, { opacity: [0, 1], duration: 40 }, reached + 10);
  });

  // Keep the timeline running to the end, so seeking p=1 lands on 1000.
  timeline.add({ hold: 0 }, { hold: 1, duration: 1 }, 999);

  const metrics = [...root.querySelectorAll<HTMLElement>("[data-countup]")];
  const lastShown = new Map<HTMLElement, string>();
  const onProgress = (p: number) => {
    const t = segment(p, COUNT_START, 1);
    for (const el of metrics) {
      const target = el.dataset.countup ?? "";
      const text = countUp(target, t);
      if (lastShown.get(el) !== text) {
        lastShown.set(el, text);
        el.dataset.count = text;
      }
    }
  };

  return { timeline, range: desktop ? "pinned" : "pass", onProgress };
};

export default buildPipeline;
