"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { LANDING_PREVIEW_PATH } from "@/lib/landing/route";

const SIZE = 640;
/** Fraction of the remaining distance covered per frame. */
const EASE = 0.14;

/** A soft lime glow that trails the pointer. Desktop pointers only. */
export default function CursorSpotlight() {
  const ref = useRef<HTMLDivElement>(null);
  // The redesigned landing (/preview) replaces every glow/canvas effect with
  // SVG motion; the spotlight sits in the layout, so it opts out there.
  const off = usePathname() === LANDING_PREVIEW_PATH;

  useEffect(() => {
    const el = ref.current;
    if (!el || off) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = !window.matchMedia("(pointer: fine)").matches;
    // Respect reduced-transparency: the glow is a translucent layer, so users who
    // ask for less transparency get none of it — the loop never starts and the
    // div stays at its opacity-0 rest state.
    const flat = window.matchMedia("(prefers-reduced-transparency: reduce)").matches;
    if (reduced || coarse || flat) return;

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
  }, [off]);

  if (off) return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="ease-brand pointer-events-none fixed top-0 left-0 z-55 opacity-0 transition-opacity duration-(--dur-slow) will-change-transform"
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
