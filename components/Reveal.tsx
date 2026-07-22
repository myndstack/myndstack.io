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
};

/** Fades + rises its children in the first time they enter the viewport. */
export default function Reveal({ children, className = "", style, delay, id }: Props) {
  const reduced = useReducedMotion();
  const ref = useReveal<HTMLDivElement>(!reduced);

  return (
    <div
      ref={ref}
      id={id}
      className={`reveal ${className}`}
      // Stagger is part of the motion, so it goes when motion does.
      style={delay && !reduced ? { ...style, transitionDelay: `${delay}s` } : style}
    >
      {children}
    </div>
  );
}
