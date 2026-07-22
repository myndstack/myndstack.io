"use client";

import { useEffect, useMemo, useRef } from "react";
import { formatMetric, parseMetric } from "@/lib/format";
import { useInView, useReducedMotion } from "@/lib/hooks";

const DURATION_MS = 1100;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Counts a stat up to its final value the first time it scrolls into view.
 *
 * The digits are written straight to the DOM rather than through state — at 60fps
 * for a second, per stat, re-rendering would be pure waste. The server renders
 * the final value, so the number is correct before hydration and under reduced
 * motion, and the layout never shifts.
 */
export default function CountUp({ value }: { value: string }) {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView<HTMLSpanElement>(0.4);
  const digitsRef = useRef<HTMLSpanElement>(null);
  const metric = useMemo(() => parseMetric(value), [value]);

  useEffect(() => {
    const el = digitsRef.current;
    if (!el || !metric || reduced || !inView) return;

    let raf = 0;
    let start = 0;

    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / DURATION_MS);
      el.textContent = formatMetric(metric.target * easeOutCubic(t), metric);
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      // Whatever interrupted us, the true value is what should be on screen.
      el.textContent = value;
    };
  }, [inView, reduced, metric, value]);

  if (!metric) return <span>{value}</span>;

  return (
    <span ref={ref}>
      {/* The animating digits are decorative; assistive tech reads the final value. */}
      <span ref={digitsRef} aria-hidden="true">
        {value}
      </span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
