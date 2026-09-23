/**
 * The contract between MotionChapter (the client island that owns scheduling)
 * and a chapter's `*.motion.ts` builder (which only describes the animation).
 * Types only — no directive, no runtime.
 */
import type { Timeline } from "@/lib/motion/anime/core";
import type { ProgressRange } from "@/lib/motion/progress";

export type ChapterContext = {
  /** The chapter's root element (MotionChapter's wrapper). */
  readonly root: HTMLElement;
  /** True at the design's `sm` breakpoint and up (47.5rem). */
  readonly desktop: boolean;
};

export type ChapterMotion = {
  /** Built with `autoplay: false`; MotionChapter plays or seeks it. */
  readonly timeline: Timeline;
  /** For scrubbed chapters: how scroll maps to progress (default "pinned"). */
  readonly range?: ProgressRange;
  /** Scrubbed chapters: cheap class/text updates per progress change. */
  readonly onProgress?: (p: number) => void;
};

export type ChapterBuilder = (ctx: ChapterContext) => ChapterMotion;

export type ChapterModule = { readonly default: ChapterBuilder };

/** `data-motion` on a chapter root. CSS keys the blueprint draft state off it. */
export type ChapterState = "idle" | "ready" | "playing" | "scrub" | "done";
