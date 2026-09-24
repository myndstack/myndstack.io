/**
 * Test fixture: the designed page laid out at a viewport height, the way the
 * landing's CSS lays it out — scene spacers from planScenes() (overlapping
 * the item above by a panel), flowing sheets at typical heights — as the
 * marker boxes the director would measure. Imported by tests only.
 */
import { BEATS } from "./beats";
import type { MarkerBox } from "./timeline";
import { PAGE, PANEL, planScenes, type FlowId } from "./scenes";
import type { SceneId } from "./types";

/** Typical sheet heights, svh (they're content-driven on the real page). */
export const FLOW_SVH: Readonly<Record<FlowId, number>> = { pricing: 180, faq: 120, contact: 170 };

export function layoutPage(vh: number, skip: readonly SceneId[] = []) {
  const px = (svh: number) => (svh * vh) / 100;
  const plans = planScenes(BEATS.filter((b) => !skip.includes(b.scene)));
  const markers = new Map<string, MarkerBox>();
  let top = 0;
  let prev: "scene" | "flow" | null = null;
  for (const item of PAGE) {
    if (item.kind === "scene") {
      const plan = plans.find((p) => p.id === item.id);
      if (!plan) continue;
      if (plan.overlap) top -= px(PANEL);
      for (const m of plan.markers) markers.set(m.id, { top: top + px(m.at) - px(0.5), height: px(1) });
      top += px(plan.length);
      prev = "scene";
    } else {
      if (prev === "scene") top -= px(PANEL);
      top += px(FLOW_SVH[item.id]);
      prev = "flow";
    }
  }
  return { markers, end: top - vh };
}
