import type { CSSProperties } from "react";

import { SCROLL_PLAN } from "@/lib/landing/engine/beats";
import { READING } from "@/lib/landing/engine/choreography";

/**
 * SCROLL_PLAN, as inline custom properties the landing CSS reads under the
 * pinned layout: a block's length (`--block`) and a FRAME marker's position
 * (`--at`, `--size`). One source of truth — the choreography's tests check the
 * plan, the page implements it, and neither can drift from the other.
 */
export function blockStyle(block: string): CSSProperties {
  const plan = SCROLL_PLAN.find((b) => b.block === block);
  return plan ? ({ "--block": `${plan.svh}svh` } as CSSProperties) : {};
}

export function markerStyle(block: string, id: string): CSSProperties {
  const marker = SCROLL_PLAN.find((b) => b.block === block)?.markers.find((m) => m.id === id);
  return marker ? ({ "--at": `${marker.at}svh`, "--size": `${marker.size ?? 1}svh` } as CSSProperties) : {};
}

/**
 * Where an anchor jump should land when pinned: on `marker`'s hold, not on the
 * section's first pixel (the capabilities, for one, open with the engine's
 * rise on an empty screen). `blocks` are the section's blocks from its top,
 * through the one holding the marker. Read as `scroll-margin-top` under pin.
 */
export function landStyle(blocks: readonly string[], marker: string): CSSProperties {
  let before = 0;
  for (const block of blocks) {
    const plan = SCROLL_PLAN.find((b) => b.block === block);
    const m = plan?.markers.find((x) => x.id === marker);
    if (m) return { "--land": `${Math.round((READING * 100 - before - m.at) * 100) / 100}svh` } as CSSProperties;
    before += plan?.svh ?? 0;
  }
  return {};
}
