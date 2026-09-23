"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { SPRING_UI } from "@/lib/motion/tokens";

type Anime = {
  readonly animate: typeof import("@/lib/motion/anime/core").animate;
  readonly ease: ReturnType<typeof import("@/lib/motion/anime/spring").spring>;
};

/** How far (px) the wrapped control may lean toward the pointer. */
const MAX_PX = 10;

/**
 * Leans its child toward the pointer on a spring, and springs back on leave.
 * Fine pointers with motion allowed only — on touch or reduced motion it's a
 * plain wrapper. The rect is read once on enter, never per move.
 */
export default function MagneticSpring({ children }: { readonly children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;

    // The engine loads on the first hover, not with the page.
    let anime: Anime | null = null;
    let loading = false;
    const load = () => {
      if (anime || loading) return;
      loading = true;
      void Promise.all([import("@/lib/motion/anime/core"), import("@/lib/motion/anime/spring")]).then(
        ([core, springs]) => {
          anime = { animate: core.animate, ease: springs.spring(SPRING_UI) };
        },
      );
    };
    let rect: DOMRect | null = null;

    const onEnter = () => {
      load();
      rect = el.getBoundingClientRect();
    };
    const onMove = (e: PointerEvent) => {
      if (!rect || !anime) return;
      const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      anime.animate(el, { x: dx * MAX_PX, y: dy * MAX_PX, ease: anime.ease });
    };
    const onLeave = () => {
      rect = null;
      anime?.animate(el, { x: 0, y: 0, ease: anime.ease });
    };

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <span ref={ref} className="inline-block will-change-transform">
      {children}
    </span>
  );
}
