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
  /** True when the pinned layout is live (PIN_QUERY in lib/motion/pin.ts). */
  readonly desktop: boolean;
  /** Coarse pointer (touch): no cursor effects, a quicker glide. */
  readonly coarse: boolean;
};

export type Ambient = {
  readonly play: () => void;
  readonly pause: () => void;
};

export type ChapterMotion = {
  /**
   * Built paused. MotionChapter plays it (mode "once") or seeks it (mode
   * "scrub"). For a segmented scrub its duration must be
   * segments × SEGMENT_UNIT (lib/motion/segments.ts).
   */
  readonly timeline: Timeline;
  /** Overrides the chapter's `kind` — e.g. a run that scrubs on desktop but plays once on phones. */
  readonly mode?: "once" | "scrub";
  /** Scrub without segments: how scroll maps to progress (default "pinned"). */
  readonly range?: ProgressRange;
  /**
   * Scrub by `[data-segment]` children: each segment's scroll range comes from
   * where it sits in the page, each gets SEGMENT_UNIT of timeline. `enter`
   * adds a leading segment for the screen before the run reaches the top.
   */
  readonly segmented?: {
    readonly enter?: boolean;
    /**
     * Start each segment this many viewports BEFORE its element reaches the
     * top — 0.5 makes a chapter current while its copy is mid-screen rather
     * than scrolling out of the top.
     */
    readonly lead?: number;
  };
  /** Glide toward the scroll position instead of snapping (lib/motion/smooth.ts). */
  readonly smooth?: { readonly tauMs: number };
  /** Plays once on load if the run starts in view; otherwise completes at once. */
  readonly intro?: Timeline;
  /** Continuous decoration (the canvas field): runs only while on screen. */
  readonly ambient?: Ambient;
  /** Scrubbed chapters: cheap class/text updates when the (quantised) time changes. */
  readonly onProgress?: (p: number, time: number) => void;
  /**
   * Undo everything scope.revert() doesn't: listeners, observers, intervals,
   * canvas pixels, data-* attributes and text the builder wrote by hand.
   */
  readonly dispose?: () => void;
};

export type ChapterBuilder = (ctx: ChapterContext) => ChapterMotion;

export type ChapterModule = { readonly default: ChapterBuilder };

/** `data-motion` on a chapter root. */
export type ChapterState = "idle" | "ready" | "playing" | "scrub" | "done";
