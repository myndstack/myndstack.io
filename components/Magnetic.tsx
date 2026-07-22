"use client";

import { useRef, type ReactNode } from "react";
import { useMediaQuery, useReducedMotion } from "@/lib/hooks";

/** Fraction of the cursor's offset from centre that the element follows. */
const PULL = 0.28;
/** Hard cap so the element never detaches from its slot in the layout. */
const MAX_PX = 8;

/**
 * Nudges its child toward the cursor on hover. Desktop pointers only, and the
 * transform lives on a wrapper so the child keeps its own hover transitions.
 */
export default function Magnetic({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  // Evaluated once via a subscription rather than per pointer event — mousemove
  // fires continuously, and matchMedia allocates a MediaQueryList each call.
  const finePointer = useMediaQuery("(pointer: fine)");
  const reduced = useReducedMotion();
  const enabled = finePointer && !reduced;

  const clamp = (n: number) => Math.max(-MAX_PX, Math.min(MAX_PX, n));

  const onMouseMove = (event: React.MouseEvent<HTMLSpanElement>) => {
    const el = ref.current;
    if (!el || !enabled) return;

    const rect = el.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    el.style.transform = `translate(${clamp(dx * PULL)}px, ${clamp(dy * PULL)}px)`;
  };

  const reset = () => {
    if (ref.current) ref.current.style.transform = "";
  };

  return (
    <span
      ref={ref}
      onMouseMove={enabled ? onMouseMove : undefined}
      onMouseLeave={enabled ? reset : undefined}
      className={`ease-brand inline-block transition-transform duration-300 will-change-transform ${className}`}
    >
      {children}
    </span>
  );
}
