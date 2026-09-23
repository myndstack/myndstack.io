"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { useMediaQuery, useReducedMotion, useScrollFrame } from "@/lib/hooks";
import { createScope } from "@/lib/motion/anime/core";
import type { ChapterBuilder, ChapterMotion, ChapterState } from "@/lib/motion/chapter";
import { chapterProgress, quantize, type ChapterGeometry } from "@/lib/motion/progress";
import { registerChapter } from "@/lib/motion/registry";

import { CHAPTER_LOADERS, type ChapterId } from "./loaders";

/** The design's `sm` breakpoint (47.5rem) — where pinned chapters start. */
const DESKTOP_QUERY = "(min-width: 47.5rem)";
/** Load a chapter's motion code when it is within ~1.5 screens. */
const LOAD_MARGIN = "150% 0px 150% 0px";
/** If the motion chunk hasn't built by then, show the built page instead. */
const BUILD_TIMEOUT_MS = 3000;
/** Progress grid: sub-pixel scroll noise inside one step doesn't re-seek. */
const PROGRESS_STEP = 1 / 2000;
/** iOS/Android toolbar show/hide changes innerHeight by ~50–110px; ignore it. */
const TOOLBAR_JITTER_PX = 120;

type Props = {
  /** Which chapter — keys its lazy motion module in ./loaders (a server
   *  component can't hand a client component an `import()` function). Also
   *  the `data-chapter` value that tests and CSS key off. */
  readonly id: ChapterId;
  /** Play once on entry, or scrub with scroll. */
  readonly kind: "once" | "scrub";
  /** Load the builder immediately (the hero) instead of when near. */
  readonly eager?: boolean;
  readonly className?: string;
  /** Server-rendered, fully built markup. */
  readonly children: ReactNode;
};

/**
 * Client island around one landing chapter. The chapter's markup is rendered
 * on the server in its finished state; this only schedules the motion:
 *
 * - loads the chapter's builder lazily (near the viewport, or at once if eager)
 * - builds it inside an anime scope, reverted on unmount / breakpoint change
 * - "once": plays when the chapter enters view, remembers that it played
 * - "scrub": seeks a paused timeline from the ONE site scroll loop
 *   (lib/scroll.ts via useScrollFrame) using geometry cached outside the frame
 * - reduced motion, a failed chunk, a slow chunk, print, and the e2e
 *   `motion:finish-all` event all land on the built state (`data-motion=done`).
 */
export default function MotionChapter({ id, kind, eager = false, className, children }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const [builder, setBuilder] = useState<ChapterBuilder | null>(null);

  const motionRef = useRef<ChapterMotion | null>(null);
  const geomRef = useRef<ChapterGeometry | null>(null);
  const lastProgressRef = useRef(-1);
  /** Once-chapters that have played stay played across rebuilds. */
  const playedRef = useRef(false);
  /** Finished (reduced motion, print, test hook, timeout): end state for good. */
  const finishedRef = useRef(false);
  const stateRef = useRef<ChapterState>("idle");

  const setState = (state: ChapterState) => {
    const root = rootRef.current;
    if (!root || stateRef.current === state) return;
    stateRef.current = state;
    root.dataset.motion = state;
  };

  const seekToEnd = () => {
    const motion = motionRef.current;
    if (!motion) return;
    motion.timeline.seek(motion.timeline.duration);
    motion.onProgress?.(1);
  };

  const finish = () => {
    finishedRef.current = true;
    seekToEnd();
    setState("done");
  };

  /** Scrubbed chapters: map a scroll position to a timeline position. */
  const seekForScroll = (y: number) => {
    const motion = motionRef.current;
    const geom = geomRef.current;
    if (!motion || !geom || finishedRef.current) return;
    const p = quantize(chapterProgress(y, geom, motion.range ?? "pinned"), PROGRESS_STEP);
    if (p === lastProgressRef.current) return;
    lastProgressRef.current = p;
    motion.timeline.seek(p * motion.timeline.duration);
    motion.onProgress?.(p);
  };

  // Print and the test hook can finish this chapter at any time.
  useEffect(() => registerChapter(finish), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load the builder: now if eager, else when the chapter gets near.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (reduced) {
      finish();
      return;
    }

    let cancelled = false;
    let timeout = 0;
    const start = () => {
      timeout = window.setTimeout(() => {
        if (!cancelled && !motionRef.current) finish();
      }, BUILD_TIMEOUT_MS);
      CHAPTER_LOADERS[id]().then(
        (mod) => {
          if (!cancelled) setBuilder(() => mod.default);
        },
        () => {
          if (!cancelled) finish();
        },
      );
    };

    if (eager || typeof IntersectionObserver === "undefined") {
      start();
      return () => {
        cancelled = true;
        window.clearTimeout(timeout);
      };
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        start();
      },
      { rootMargin: LOAD_MARGIN },
    );
    io.observe(root);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      io.disconnect();
    };
  }, [reduced, eager, id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scrubbed chapters: cache geometry outside the scroll frame (the StackStory
  // pattern) — measured on layout changes and font load, never per frame.
  useEffect(() => {
    if (kind !== "scrub") return;
    const root = rootRef.current;
    if (!root) return;

    const coarse = window.matchMedia("(pointer: coarse)").matches;
    let pending = 0;
    const measure = () => {
      pending = 0;
      const rect = root.getBoundingClientRect();
      const next = { top: rect.top + window.scrollY, height: root.offsetHeight, vh: window.innerHeight };
      const prev = geomRef.current;
      // A touch toolbar collapsing is a height-only change of <120px: keep
      // the old geometry so progress doesn't jump under the thumb.
      if (
        prev &&
        coarse &&
        prev.top === next.top &&
        prev.height === next.height &&
        Math.abs(prev.vh - next.vh) < TOOLBAR_JITTER_PX
      ) {
        return;
      }
      geomRef.current = next;
      lastProgressRef.current = -1;
      seekForScroll(window.scrollY);
    };
    // Observer callbacks only schedule; the read happens in the next frame.
    const schedule = () => {
      if (!pending) pending = requestAnimationFrame(measure);
    };

    measure();
    document.fonts?.ready.then(schedule);
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    return () => {
      ro.disconnect();
      if (pending) cancelAnimationFrame(pending);
    };
  }, [kind]);

  // Build (and rebuild across the breakpoint) inside an anime scope.
  useEffect(() => {
    const root = rootRef.current;
    if (!builder || reduced || !root || !root.isConnected) return;

    const scope = createScope({ root }).add(() => {
      motionRef.current = builder({ root, desktop });
    });
    const motion = motionRef.current as ChapterMotion | null;
    if (!motion) return () => scope.revert();
    // Explicitly paused: in anime 4.5 the first seek() on a timeline that was
    // never started resumes it, and a scrubbed chapter would then keep
    // re-rendering on anime's clock (measured: ~4 style writes per frame with
    // no scrolling). Only scroll and play() may move a chapter.
    motion.timeline.pause();

    let io: IntersectionObserver | null = null;

    if (finishedRef.current || (kind === "once" && playedRef.current)) {
      seekToEnd();
      setState("done");
    } else if (kind === "scrub") {
      setState("scrub");
      lastProgressRef.current = -1;
      // Straight to the current position: a restored or anchored scroll must
      // not sit in the draft state waiting for the first scroll event.
      seekForScroll(window.scrollY);
    } else {
      setState("ready");
      const play = () => {
        setState("playing");
        motion.timeline.play();
        motion.timeline.then(() => {
          playedRef.current = true;
          setState("done");
        });
      };
      if (typeof IntersectionObserver === "undefined") {
        play();
      } else {
        io = new IntersectionObserver(
          ([entry]) => {
            if (!entry.isIntersecting) return;
            io?.disconnect();
            play();
          },
          { threshold: 0.2 },
        );
        io.observe(root);
      }
    }

    return () => {
      io?.disconnect();
      scope.revert();
      motionRef.current = null;
    };
  }, [builder, desktop, reduced, kind]);

  useScrollFrame(({ y }) => {
    if (kind === "scrub") seekForScroll(y);
  });

  return (
    <div
      ref={rootRef}
      data-chapter={id}
      data-motion="idle"
      // data-motion is driven imperatively after hydration (like Reveal's is-in).
      suppressHydrationWarning
      className={className}
    >
      {children}
    </div>
  );
}
