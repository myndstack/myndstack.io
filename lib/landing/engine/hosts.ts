/**
 * Where the engine's one canvas lives. On desktop it sits in the sticky stage
 * that spans hero → studio, then moves into whichever dock is on screen
 * (pricing, FAQ, closing); on phones it moves between in-flow slots. The
 * canvas is always inside the page's own flow, so it scrolls natively with
 * zero lag — nothing here chases a moving rect every frame.
 *
 * Pure: every input is a cached document-px measurement.
 */

export type Run = { readonly top: number; readonly bottom: number };

/**
 * The sticky stage's top in the viewport at scroll `y`: 0 while its run is on
 * screen, positive before a run that starts lower down, negative as it
 * scrolls away at the end of the run.
 */
export function stageTop(y: number, run: Run, vh: number): number {
  if (y < run.top) return run.top - y;
  return Math.min(0, run.bottom - vh - y);
}

/** Share of the stage (one viewport tall) still on screen. */
export function stageShare(y: number, run: Run, vh: number): number {
  const top = stageTop(y, run, vh);
  const visible = Math.min(vh, top + vh) - Math.max(0, top);
  return clamp01(visible / vh);
}

/**
 * Share of a host (document px) on screen, relative to how much of it could
 * be: a host taller than the viewport counts as fully visible when it fills it.
 */
export function visibleShare(host: Run, y: number, vh: number): number {
  const height = host.bottom - host.top;
  if (height <= 0) return 0;
  const visible = Math.min(host.bottom, y + vh) - Math.max(host.top, y);
  return clamp01(visible / Math.min(height, vh));
}

export type HostShare = { readonly id: string; readonly share: number };

/**
 * Which host holds the canvas. The current one keeps it while at least `keep`
 * of it is visible (so a scroll wobble never re-hosts); otherwise the most
 * visible host with at least `enter` on screen takes over; otherwise none
 * (every host shows its poster).
 */
export function pickHost(shares: readonly HostShare[], prev: string | null, enter = 0.35, keep = 0.2): string | null {
  if (prev !== null) {
    const current = shares.find((s) => s.id === prev);
    if (current && current.share >= keep) return prev;
  }
  let best: HostShare | null = null;
  for (const s of shares) {
    if (s.share >= enter && (best === null || s.share > best.share)) best = s;
  }
  return best ? best.id : null;
}

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);
