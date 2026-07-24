"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * The moving half of a marquee, paused whenever it is off screen.
 *
 * A CSS transform animation is cheap but it is not free: an infinite loop keeps
 * the compositor producing frames for the whole life of the page, including the
 * ~90% of a 17-section scroll where the band isn't visible. On a phone that is
 * battery and contention with the frames that do matter.
 *
 * Same treatment the hero canvases already give themselves — see
 * HeroNetwork/ParticleField, which stop their rAF loops the same way.
 */
export default function MarqueeTrack({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        // Cleared rather than set to "running" so the stylesheet stays the
        // single source of truth for whether there's an animation at all —
        // reduced motion collapses the duration and must keep winning.
        el.style.animationPlayState = entry.isIntersecting ? "" : "paused";
      },
      { threshold: 0 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className={className}>
      {children}
    </div>
  );
}
