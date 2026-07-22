"use client";

import { useEffect, useRef } from "react";

const SIZE = 640;
/** Fraction of the remaining distance covered per frame. */
const EASE = 0.14;

/** A soft lime glow that trails the pointer. Desktop pointers only. */
export default function CursorSpotlight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = !window.matchMedia("(pointer: fine)").matches;
    if (reduced || coarse) return;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let x = targetX;
    let y = targetY;
    let raf = 0;
    let revealed = false;

    const step = () => {
      x += (targetX - x) * EASE;
      y += (targetY - y) * EASE;
      el.style.transform = `translate(${x}px, ${y}px)`;

      // Park the loop once we've caught up rather than burning a frame forever.
      if (Math.abs(targetX - x) > 0.4 || Math.abs(targetY - y) > 0.4) {
        raf = requestAnimationFrame(step);
      } else {
        raf = 0;
      }
    };

    const onMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;

      if (!revealed) {
        revealed = true;
        el.style.opacity = "1";
      }
      if (!raf) raf = requestAnimationFrame(step);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="ease-brand pointer-events-none fixed top-0 left-0 z-55 opacity-0 transition-opacity duration-500 will-change-transform"
      style={{
        width: SIZE,
        height: SIZE,
        margin: `${-SIZE / 2}px 0 0 ${-SIZE / 2}px`,
        background:
          "radial-gradient(circle, rgba(201,242,77,.09), rgba(201,242,77,.025) 42%, transparent 70%)",
      }}
    />
  );
}
