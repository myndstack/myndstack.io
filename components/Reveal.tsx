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
      className={`reveal ${scrub ? "reveal-scrub " : ""}${className}`}
      // Stagger is part of the motion, so it goes when motion does.
      style={delay && !reduced ? { ...style, transitionDelay: `${delay}s` } : style}
    >
      {children}
    </div>
  );
}
