"use client";

import type { CSSProperties, ReactNode } from "react";
import { useReducedMotion, useReveal } from "@/lib/hooks";

type Props = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Stagger, in seconds, for siblings revealed together. */
  delay?: number;
  id?: string;
  /**
   * Scroll-scrub the fade+rise with the element's own entry progress where
   * `animation-timeline: view()` is supported, instead of firing it once on
   * entry. The animation's endpoints are byte-for-byte the `.reveal` → `.is-in`
   * rest state, so every fallback — no view() support, reduced motion, the
   * reveal watchdog, no JS — still lands on the same visible result. See
   * `.reveal-scrub` in globals.css.
   */
  scrub?: boolean;
};

/** Fades + rises its children in the first time they enter the viewport. */
export default function Reveal({
  children,
  className = "",
  style,
  delay,
  id,
  scrub,
}: Props) {
  const reduced = useReducedMotion();
  const ref = useReveal<HTMLDivElement>(!reduced);

  return (
    <div
      ref={ref}
      id={id}
      /**
       * `is-in` is added to this node's classList imperatively — by the
       * IntersectionObserver in `useReveal`, and en masse by the reveal
       * watchdog when the observer never delivers. Neither is something the
       * server can know about, so the prerendered HTML says `reveal` and the
       * live DOM can already say `reveal is-in` by the time React hydrates
       * (a slow or backgrounded tab is enough for the watchdog's 1.5s fallback
       * to land first). React then reports an attribute mismatch on every
       * revealed element on the page.
       *
       * This is the case the API is for: the difference is intentional, and
       * React must NOT patch it up — reverting `is-in` would blank the section.
       * Scoped to this element's own attributes, so a genuine mismatch in the
       * children still surfaces.
       *
       * Note this does not risk the class being clobbered later: React only
       * writes `className` when the prop value itself changes, and it is
       * static per usage here.
       */
      suppressHydrationWarning
      className={`reveal ${scrub ? "reveal-scrub " : ""}${className}`}
      // Stagger is part of the motion, so it goes when motion does.
      style={delay && !reduced ? { ...style, transitionDelay: `${delay}s` } : style}
    >
      {children}
    </div>
  );
}
