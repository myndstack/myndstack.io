"use client";

import { useEffect, useRef } from "react";

import { useScrollFrame } from "@/lib/hooks";
import { documentTop } from "@/lib/scroll-spy";

/** Sections the bar steps aside for (it would only repeat what's on screen),
 *  plus the site footer. */
const HIDE_OVER = ["pricing", "contact"] as const;

/**
 * Phones only: a slim sticky CTA at the bottom once the hero is behind you.
 * It hides over pricing, contact and the footer; its top edge is a spectrum line that
 * fills with page progress (a CSS scroll-driven animation; static elsewhere).
 * Offsets are cached outside the scroll frame; the frame writes one class,
 * only when visibility changes.
 */
export default function MobileCtaBar({ label, note }: { readonly label: string; readonly note: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const rangesRef = useRef<{ top: number; bottom: number }[]>([]);
  const shownRef = useRef<boolean | null>(null);

  useEffect(() => {
    let pending = 0;
    const measure = () => {
      pending = 0;
      const targets = [...HIDE_OVER.map((id) => document.getElementById(id)), document.querySelector("footer")];
      rangesRef.current = targets.flatMap((el) => {
        if (!(el instanceof HTMLElement)) return [];
        const top = documentTop(el);
        return [{ top, bottom: top + el.offsetHeight }];
      });
    };
    const schedule = () => {
      if (!pending) pending = requestAnimationFrame(measure);
    };
    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    return () => {
      ro.disconnect();
      if (pending) cancelAnimationFrame(pending);
    };
  }, []);

  useScrollFrame(({ y }) => {
    const el = ref.current;
    if (!el) return;
    const vh = window.innerHeight;
    const mid = y + vh * 0.6;
    const over = rangesRef.current.some((r) => mid >= r.top && mid <= r.bottom);
    const show = y > vh * 0.9 && !over;
    if (show === shownRef.current) return;
    shownRef.current = show;
    el.classList.toggle("is-shown", show);
    el.inert = !show;
  });

  return (
    <div ref={ref} className="mobile-cta" inert suppressHydrationWarning>
      <span className="mobile-cta-line" aria-hidden="true" />
      <p className="mobile-cta-text">{note}</p>
      <a href="#contact" className="btn btn-lime mobile-cta-btn">
        {label}
      </a>
    </div>
  );
}
