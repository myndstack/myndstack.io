"use client";

import { useEffect, useRef } from "react";

import { useCssSupports, useScrollFrame } from "@/lib/hooks";
import { RULER_CHAPTERS } from "@/lib/landing/chapters";
import { activeSection, documentTop, type SectionOffset } from "@/lib/scroll-spy";

/** Where a ruler tick scrolls to — the stack lands on its overview, like the nav. */
const TARGET: Partial<Record<string, string>> = { platform: "platform-anchor" };
/** Chapters on paper: the ruler takes the paper skin over them. */
const PAPER = new Set(["platform", "integrations"]);

/**
 * The fixed HUD bottom-right (wide screens): the chapter you're in, a tick per
 * chapter (each a button that jumps there and moves focus to it), and a
 * playhead for the whole page.
 *
 * Scroll work follows AGENTS.md: chapter offsets are measured on layout
 * changes (ResizeObserver + fonts), never in the frame; the frame only does
 * arithmetic and writes when the chapter changes. The playhead is a CSS
 * scroll-driven animation where supported; elsewhere a quantised `--p`.
 */
export default function ScrollRuler() {
  const rootRef = useRef<HTMLElement>(null);
  const offsetsRef = useRef<SectionOffset[]>([]);
  const activeRef = useRef<string | null>(null);
  const progressRef = useRef(-1);
  const nativeTimeline = useCssSupports("animation-timeline: scroll(root)");

  useEffect(() => {
    let pending = 0;
    const measure = () => {
      pending = 0;
      offsetsRef.current = RULER_CHAPTERS.flatMap(({ id }) => {
        const el = document.getElementById(id);
        return el ? [{ id, top: documentTop(el) }] : [];
      });
    };
    const schedule = () => {
      if (!pending) pending = requestAnimationFrame(measure);
    };
    schedule();
    document.fonts?.ready.then(schedule);
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    return () => {
      ro.disconnect();
      if (pending) cancelAnimationFrame(pending);
    };
  }, []);

  useScrollFrame(({ y, progress }) => {
    const root = rootRef.current;
    if (!root) return;
    const line = window.innerHeight * 0.5;
    const active = activeSection(offsetsRef.current, y, line) ?? RULER_CHAPTERS[0].id;
    if (active !== activeRef.current) {
      activeRef.current = active;
      root.dataset.active = active;
      root.dataset.skin = PAPER.has(active) ? "paper" : "ink";
      const chapter = RULER_CHAPTERS.find((c) => c.id === active);
      const label = root.querySelector<HTMLElement>("[data-ruler-label]");
      if (chapter && label) label.textContent = `§${chapter.n} · ${chapter.label}`;
      root.querySelectorAll<HTMLElement>(".ruler-tick").forEach((tick) => {
        if (tick.dataset.id === active) tick.setAttribute("aria-current", "true");
        else tick.removeAttribute("aria-current");
      });
    }
    if (!nativeTimeline) {
      const p = Math.round(progress * 400) / 400;
      if (p !== progressRef.current) {
        progressRef.current = p;
        root.style.setProperty("--p", String(p));
      }
    }
  });

  const jump = (id: string) => {
    const target = document.getElementById(TARGET[id] ?? id);
    const section = document.getElementById(id);
    if (!target || !section) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    if (!section.hasAttribute("tabindex")) section.setAttribute("tabindex", "-1");
    section.focus({ preventScroll: true });
  };

  return (
    <nav
      ref={rootRef}
      className="ruler"
      aria-label="Chapters"
      data-active={RULER_CHAPTERS[0].id}
      data-skin="ink"
      data-native={nativeTimeline ? "true" : "false"}
      suppressHydrationWarning
    >
      <p className="ruler-label" aria-hidden="true" data-ruler-label>
        §{RULER_CHAPTERS[0].n} · {RULER_CHAPTERS[0].label}
      </p>
      <div className="ruler-track">
        <span className="ruler-playhead" aria-hidden="true" />
        <ol className="ruler-ticks">
          {RULER_CHAPTERS.map((c) => (
            <li key={c.id}>
              <button type="button" className="ruler-tick" data-id={c.id} onClick={() => jump(c.id)}>
                <span className="sr-only">
                  Chapter {c.n}: {c.label}
                </span>
                <span className="ruler-tip" aria-hidden="true">
                  {c.n} {c.label}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
