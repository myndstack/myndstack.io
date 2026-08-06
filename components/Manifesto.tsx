"use client";

import { useEffect, useMemo, useState } from "react";
import { useCssSupports, useInView, useReducedMotion } from "@/lib/hooks";

/** Delay between each word lighting up. */
const STEP_MS = 55;

/** Oversized statement whose words brighten one at a time on entry. */
export default function Manifesto({ lead, keep }: { lead: string; keep: string }) {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView<HTMLParagraphElement>(0.55);
  const [animatedCount, setAnimatedCount] = useState(0);

  const WORDS = useMemo(() => lead.trim().split(/\s+/), [lead]);

  /**
   * Where `animation-timeline: view()` is supported, the words brighten (and
   * dim on scroll-up) as the paragraph scrolls through the viewport, driven on
   * the compositor — see `.manifesto-word` in globals.css. There the JS timer
   * path is redundant, so it's skipped and `litCount` stays 0 (the CSS
   * animation owns the colour). Older browsers keep the timer cascade.
   *
   * `useCssSupports` reads `false` during SSR and hydration; the real answer
   * arrives after mount. Same primitive `useMediaQuery` uses — via
   * `useSyncExternalStore`, so no set-state-in-effect and no risk that a
   * future JSX read produces a hydration mismatch.
   */
  const nativeView = useCssSupports("animation-timeline: view()");

  /**
   * Under reduced motion every word is simply lit — derived here rather than
   * pushed through `setState` inside the effect. Same result, one render
   * instead of two, and no set-state-in-an-effect cascade.
   */
  const litCount = reduced ? WORDS.length : nativeView ? 0 : animatedCount;

  useEffect(() => {
    if (!inView || reduced || nativeView) return;

    const timers = WORDS.map((_, i) =>
      window.setTimeout(() => setAnimatedCount(i + 1), i * STEP_MS),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [inView, reduced, nativeView, WORDS]);

  return (
    <section
      id="manifesto"
      // A landmark with no accessible name announces as "region" — the eyebrow
      // is the visible name, so point at it. Screen readers now list this in
      // the landmark rotor as "Manifesto region", the same as any other
      // sectioned block.
      aria-labelledby="manifesto-eyebrow"
      tabIndex={-1}
      className="mx-auto max-w-[1120px] px-5 py-28 focus:outline-none sm:px-14"
    >
      <div id="manifesto-eyebrow" className="eyebrow mb-[26px] tracking-[0.16em]">Manifesto</div>
      <p
        ref={ref}
        className="m-0 font-display text-[30px] leading-[1.16] font-medium tracking-[-0.02em] text-balance sm:text-[50px]"
      >
        {WORDS.map((word, i) => (
          <span
            key={`${word}-${i}`}
            className={`manifesto-word${i < litCount ? " is-lit" : ""}`}
            // Per-word index staggers the scroll-driven brighten (globals.css).
            style={{ "--i": i } as React.CSSProperties}
          >
            {word}{" "}
          </span>
        ))}
        <span className="text-lime">{keep}</span>
      </p>
    </section>
  );
}
