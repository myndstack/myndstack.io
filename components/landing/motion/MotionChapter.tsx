"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { useReducedMotion, useScrollFrame } from "@/lib/hooks";
import { createScope } from "@/lib/motion/anime/core";
import { createTimer, type Timer } from "@/lib/motion/anime/timer";
import type { ChapterBuilder, ChapterMotion, ChapterState } from "@/lib/motion/chapter";
import { PIN_QUERY } from "@/lib/motion/pin";
import { chapterProgress, quantize, type ChapterGeometry } from "@/lib/motion/progress";
import { registerChapter } from "@/lib/motion/registry";
import { segmentTime, type RunGeometry } from "@/lib/motion/segments";
import { clampDt, clampLag, glideStep, isJump } from "@/lib/motion/smooth";
import { documentTop } from "@/lib/scroll-spy";

import { CHAPTER_LOADERS, type ChapterId } from "./loaders";

/** Load a chapter's motion code when it is within ~1.5 screens. */
const LOAD_MARGIN = "150% 0px 150% 0px";
/** If the motion chunk hasn't built by then, stay on the built page. */
const BUILD_TIMEOUT_MS = 3000;
/** Timeline grid: sub-pixel scroll noise inside one step doesn't re-seek. */
const TIME_STEP = 0.5;
/** iOS/Android toolbar show/hide changes innerHeight by ~50–110px; ignore it. */
const TOOLBAR_JITTER_PX = 120;
/** The glide never trails the scroll by more than ~a third of a segment. */
const MAX_LAG = 300;
/** Within this many timeline units the glide snaps and stops. */
const SETTLE_EPS = 0.5;

/**
 * A media query's live value, correct from the FIRST client render. The shared
 * useMediaQuery reports its server snapshot (false) through hydration — right
 * for anything rendered, but here the value only drives effects, and building
 * a run in the wrong mode for a frame (then rebuilding) restarts its intro.
 * Nothing is rendered from this, so reading the real value at once is safe.
 */
function useLiveMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

/** True when html[data-anim="on"] — see lib/landing/motion-flag.ts. */
const motionAllowed = () => document.documentElement.dataset.anim === "on";

type Props = {
  /** Which chapter — keys its lazy motion module in ./loaders. Also the
   *  `data-chapter` value that tests and CSS key off. */
  readonly id: ChapterId;
  /** Play once on entry, or scrub with scroll. A builder may override. */
  readonly kind: "once" | "scrub";
  /** Load the builder immediately (the hero) instead of when near. */
  readonly eager?: boolean;
  readonly className?: string;
  /** Server-rendered, fully built markup. */
  readonly children: ReactNode;
};

/**
 * Client island around one landing chapter. The markup is rendered on the
 * server in its finished state; this only schedules motion:
 *
 * - loads the chapter's builder lazily (near the viewport, or at once if eager)
 * - builds it inside an anime scope — every timeline and timer is created in
 *   `scope.add`, so `revert()` owns them; `dispose()` undoes the rest
 * - "once": plays when the chapter enters view, remembers that it played
 * - "scrub": maps scroll to timeline time from the ONE site scroll loop
 *   (useScrollFrame) using geometry cached outside the frame, optionally by
 *   `[data-segment]` children, and glides toward it on anime's own clock
 * - `finish()` (reduced motion, test hook, print, a slow or failed chunk)
 *   lands a once-chapter on its end state and snaps a scrub to the CURRENT
 *   scroll position with the glide, intro and ambient off. Layout never
 *   changes: pinning is CSS-only (the `pin:` variant), decided before paint.
 */
export default function MotionChapter({ id, kind, eager = false, className, children }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const desktop = useLiveMediaQuery(PIN_QUERY);
  const coarse = useLiveMediaQuery("(pointer: coarse)");
  const [builder, setBuilder] = useState<ChapterBuilder | null>(null);

  const motionRef = useRef<ChapterMotion | null>(null);
  const glideRef = useRef<Timer | null>(null);
  const geomRef = useRef<ChapterGeometry | null>(null);
  const runRef = useRef<RunGeometry | null>(null);
  const stateRef = useRef<ChapterState>("idle");

  /** Scroll-derived target time, the time shown, and the last one seeked. */
  const targetRef = useRef(-1);
  const displayRef = useRef(0);
  const appliedRef = useRef(-1);
  const lastYRef = useRef(0);
  const lastTickRef = useRef(0);
  const glideStateRef = useRef<"idle" | "moving">("idle");

  /** Once-chapters that have played stay played across rebuilds. */
  const playedRef = useRef(false);
  /** A once-chapter was finished: end state for good. */
  const finishedRef = useRef(false);
  /** A scrub was finished: keep scrubbing, but snap — no glide, intro or ambient. */
  const settledRef = useRef(false);

  const modeOf = (motion: ChapterMotion | null) => motion?.mode ?? kind;

  const setState = (state: ChapterState) => {
    const root = rootRef.current;
    if (!root || stateRef.current === state) return;
    stateRef.current = state;
    root.dataset.motion = state;
  };

  const setGlide = (state: "idle" | "moving") => {
    const root = rootRef.current;
    if (!root || glideStateRef.current === state) return;
    glideStateRef.current = state;
    root.dataset.glide = state;
  };

  /** Seek the timeline — only when the time actually changed. */
  const apply = (time: number) => {
    const motion = motionRef.current;
    if (!motion || time === appliedRef.current) return;
    appliedRef.current = time;
    motion.timeline.seek(time);
    const duration = motion.timeline.duration;
    motion.onProgress?.(duration > 0 ? time / duration : 1, time);
  };

  const timeForScroll = (y: number): number | null => {
    const motion = motionRef.current;
    if (!motion) return null;
    if (motion.segmented) return runRef.current ? segmentTime(y, runRef.current) : null;
    const geom = geomRef.current;
    if (!geom) return null;
    return chapterProgress(y, geom, motion.range ?? "pinned") * motion.timeline.duration;
  };

  const stopGlide = () => {
    glideRef.current?.pause();
    setGlide("idle");
  };

  /** Jump straight to the scroll position (build, re-measure, bfcache, finish). */
  const snap = (y: number) => {
    const raw = timeForScroll(y);
    if (raw === null) return;
    const target = quantize(raw, TIME_STEP);
    lastYRef.current = y;
    targetRef.current = target;
    displayRef.current = target;
    stopGlide();
    apply(target);
  };

  const onScroll = (y: number) => {
    const motion = motionRef.current;
    if (!motion || modeOf(motion) !== "scrub") return;
    const raw = timeForScroll(y);
    if (raw === null) return;
    const target = quantize(raw, TIME_STEP);
    // The early return that keeps a settled page from writing anything.
    if (target === targetRef.current) return;
    targetRef.current = target;
    const vh = geomRef.current?.vh ?? 800;
    const jumped = isJump(lastYRef.current, y, vh);
    lastYRef.current = y;

    const glide = glideRef.current;
    if (!glide || settledRef.current || jumped) {
      displayRef.current = target;
      stopGlide();
      apply(target);
      return;
    }
    displayRef.current = clampLag(displayRef.current, target, MAX_LAG);
    if (glideStateRef.current === "idle") {
      lastTickRef.current = performance.now();
      setGlide("moving");
      glide.resume();
    }
  };

  const tickGlide = () => {
    const motion = motionRef.current;
    if (!motion?.smooth) return;
    const now = performance.now();
    const dt = clampDt(now - lastTickRef.current);
    lastTickRef.current = now;
    const { value, settled } = glideStep(displayRef.current, targetRef.current, dt, {
      tauMs: motion.smooth.tauMs,
      eps: SETTLE_EPS,
      maxLag: MAX_LAG,
    });
    displayRef.current = value;
    apply(value);
    if (settled) stopGlide();
  };

  const finish = () => {
    const motion = motionRef.current;
    if (modeOf(motion) === "scrub") {
      settledRef.current = true;
      if (motion) {
        motion.intro?.complete();
        motion.ambient?.pause();
        const root = rootRef.current;
        if (root) root.dataset.intro = "done";
        snap(window.scrollY);
      }
      setState("done");
      return;
    }
    finishedRef.current = true;
    if (motion) {
      motion.ambient?.pause();
      motion.timeline.seek(motion.timeline.duration);
      motion.onProgress?.(1, motion.timeline.duration);
    }
    setState("done");
  };

  /** Read layout (outside any scroll frame): chapter box and segment stops. */
  const measure = (force: boolean) => {
    const root = rootRef.current;
    if (!root) return;
    const vh = window.innerHeight;
    const top = documentTop(root);
    const next: ChapterGeometry = { top, height: root.offsetHeight, vh };
    const prev = geomRef.current;
    const jitterOnly =
      !force &&
      prev !== null &&
      coarse &&
      prev.top === next.top &&
      prev.height === next.height &&
      Math.abs(prev.vh - next.vh) < TOOLBAR_JITTER_PX;
    if (jitterOnly) return;
    geomRef.current = next;

    const motion = motionRef.current;
    if (motion?.segmented) {
      const segments = Array.from(root.querySelectorAll<HTMLElement>("[data-segment]"));
      const lead = (motion.segmented.lead ?? 0) * vh;
      const stops = segments.map((el, i) => documentTop(el) - top - (i === 0 ? 0 : lead));
      runRef.current = {
        top,
        stops: motion.segmented.enter ? [-vh, ...stops] : stops,
        end: Math.max(0, next.height - vh),
      };
    }
    if (motion && modeOf(motion) === "scrub") snap(window.scrollY);
  };

  // Print and the test hook can finish this chapter at any time.
  useEffect(() => registerChapter(finish), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load the builder: now if eager, else when the chapter gets near.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // The pre-paint flag (MOTION_FLAG_SCRIPT) is the single switch: reduced
    // motion and `?motion=off` both leave it unset, and CSS has already laid
    // the page out static — building a scrub for it would animate nothing.
    if (reduced || !motionAllowed()) {
      finish();
      return;
    }

    let cancelled = false;
    let timeout = 0;
    const start = () => {
      // Once-chapters hold a draft state until they play, so a slow chunk must
      // not strand them: after the timeout they land built. Scrubbed runs need
      // no watchdog — their server HTML is already built and pinning is CSS —
      // and finishing one would switch its glide off for the whole session.
      if (kind === "once") {
        timeout = window.setTimeout(() => {
          if (!cancelled && !motionRef.current) finish();
        }, BUILD_TIMEOUT_MS);
      }
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
  }, [reduced, eager, id, kind]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build (and rebuild across the pin breakpoint) inside an anime scope.
  useEffect(() => {
    const root = rootRef.current;
    if (!builder || reduced || !motionAllowed() || !root || !root.isConnected) return;

    let failed = false;
    const scope = createScope({ root }).add(() => {
      try {
        const motion = builder({ root, desktop, coarse });
        motionRef.current = motion;
        // Explicitly paused: in anime 4.5 the first seek() on a timeline that
        // was never started resumes it, and a scrubbed chapter would then keep
        // re-rendering on anime's clock. Only scroll and play() move a chapter.
        motion.timeline.pause();
        motion.intro?.pause();
        glideRef.current = motion.smooth ? createTimer({ autoplay: false, onUpdate: tickGlide }) : null;
      } catch (error) {
        failed = true;
        motionRef.current = null;
        if (process.env.NODE_ENV !== "production") console.error(`[motion:${id}]`, error);
      }
    });
    const motion = motionRef.current as ChapterMotion | null;
    if (failed || !motion) {
      scope.revert();
      finish();
      return;
    }

    appliedRef.current = -1;
    targetRef.current = -1;
    glideStateRef.current = "idle";
    root.dataset.built = "true";
    let io: IntersectionObserver | null = null;
    let ambientIo: IntersectionObserver | null = null;
    let onVisibility: (() => void) | null = null;
    let onPageShow: ((e: PageTransitionEvent) => void) | null = null;

    // Continuous decoration runs only while on screen and the tab is visible.
    if (motion.ambient && typeof IntersectionObserver !== "undefined") {
      const ambient = motion.ambient;
      let visible = false;
      const update = () => {
        if (visible && !document.hidden && !settledRef.current && !finishedRef.current) ambient.play();
        else ambient.pause();
      };
      ambientIo = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        update();
      });
      ambientIo.observe(root);
      onVisibility = update;
      document.addEventListener("visibilitychange", onVisibility);
    }

    if (modeOf(motion) === "scrub") {
      setState(settledRef.current ? "done" : "scrub");
      // Straight to the current position: a restored or anchored scroll must
      // not sit in a stale state waiting for the first scroll event.
      measure(true);

      if (motion.intro) {
        const atTop = window.scrollY < window.innerHeight * 0.5;
        if (atTop && !settledRef.current) {
          root.dataset.intro = "playing";
          motion.intro.play();
          motion.intro.then(() => {
            root.dataset.intro = "done";
          });
        } else {
          motion.intro.complete();
          root.dataset.intro = "done";
        }
      }

      // Back/forward cache: the page comes back mid-scroll with stale time.
      onPageShow = (e) => {
        if (e.persisted) measure(true);
      };
      window.addEventListener("pageshow", onPageShow);
    } else if (finishedRef.current || playedRef.current) {
      motion.timeline.seek(motion.timeline.duration);
      motion.onProgress?.(1, motion.timeline.duration);
      setState("done");
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
      ambientIo?.disconnect();
      if (onVisibility) document.removeEventListener("visibilitychange", onVisibility);
      if (onPageShow) window.removeEventListener("pageshow", onPageShow);
      motion.ambient?.pause();
      motion.dispose?.();
      scope.revert();
      motionRef.current = null;
      glideRef.current = null;
      runRef.current = null;
      delete root.dataset.intro;
      delete root.dataset.built;
    };
  }, [builder, desktop, coarse, reduced, kind]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scrubbed chapters: cache geometry outside the scroll frame — measured on
  // layout changes and font load, never per frame.
  useEffect(() => {
    if (kind !== "scrub") return;
    const root = rootRef.current;
    if (!root) return;

    let pending = 0;
    const run = () => {
      pending = 0;
      measure(false);
    };
    // Observer callbacks only schedule; the read happens in the next frame.
    const schedule = () => {
      if (!pending) pending = requestAnimationFrame(run);
    };

    schedule();
    document.fonts?.ready.then(schedule);
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    return () => {
      ro.disconnect();
      if (pending) cancelAnimationFrame(pending);
    };
  }, [kind, coarse]); // eslint-disable-line react-hooks/exhaustive-deps

  useScrollFrame(({ y }) => {
    if (kind === "scrub") onScroll(y);
  });

  return (
    <div
      ref={rootRef}
      data-chapter={id}
      data-motion="idle"
      // data-motion / data-glide / data-intro are driven imperatively after
      // hydration (like Reveal's is-in).
      suppressHydrationWarning
      className={className}
    >
      {children}
    </div>
  );
}
