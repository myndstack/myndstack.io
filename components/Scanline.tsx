"use client";

import { useInView, useReducedMotion } from "@/lib/hooks";

/**
 * A lime hairline that sweeps the top edge of a section the first time it comes
 * into view, then fades out. Sits absolutely inside a `relative` section.
 */
export default function Scanline() {
  const reduced = useReducedMotion();
  // The element is 1px tall, so any threshold above 0 would never resolve.
  const [ref, inView] = useInView<HTMLSpanElement>(0);

  if (reduced) return null;

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={`scanline${inView ? " is-on" : ""}`}
    />
  );
}
