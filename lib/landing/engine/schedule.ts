/**
 * Render on demand: whether the engine needs another frame, and at what rate.
 * When nothing moves and the pose allows no idle motion the loop stops
 * completely — no rAF, no GPU work, no DOM writes (AGENTS.md: a still page
 * costs nothing). Pure; the director feeds it each frame.
 */

export type ScheduleInput = {
  /** Tab visible, the engine's host on screen and the engine live. */
  readonly visible: boolean;
  /** The glide hasn't settled, or a tween or fade is running. */
  readonly moving: boolean;
  /** The current pose allows idle motion (the `ambient` channel). */
  readonly ambient: boolean;
  /** Since the last scroll, pointer or signal input. */
  readonly sinceInputMs: number;
  /** Idle motion sleeps after this long without input. */
  readonly idleSleepMs: number;
  /** The tier's idle frame rate (0 = none). */
  readonly ambientFps: 0 | 30 | 60;
};

export type ScheduleDecision = { readonly run: boolean; readonly fps: 0 | 30 | 60 };

const STOP: ScheduleDecision = { run: false, fps: 0 };

export function schedule(i: ScheduleInput): ScheduleDecision {
  if (!i.visible) return STOP;
  if (i.moving) return { run: true, fps: 60 };
  if (i.ambient && i.ambientFps > 0 && i.sinceInputMs < i.idleSleepMs) return { run: true, fps: i.ambientFps };
  return STOP;
}

/**
 * Throttle for idle frames. A frame is due once 1/fps has nearly elapsed —
 * the tolerance keeps 30 fps on a 60 Hz display at exactly every other frame
 * instead of beating between 1 and 2 frames of jitter.
 */
export function frameDue(lastMs: number, nowMs: number, fps: 0 | 30 | 60): boolean {
  if (fps === 0) return false;
  if (fps === 60) return true;
  return nowMs - lastMs >= 1000 / fps - 4;
}
