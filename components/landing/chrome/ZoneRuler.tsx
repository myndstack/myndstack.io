"use client";

import { useEffect, useRef } from "react";

import { useScrollFrame } from "@/lib/hooks";
import { RULER_CHAPTERS } from "@/lib/landing/chapters";
import { activeSection, documentTop, type SectionOffset } from "@/lib/scroll-spy";

/**
 * The zone ruler on the right rail (from 1000px): one zone per chapter,
 * sized by how much scroll it takes, the current one marked in the accent,
 * and a lime carriage for where you are. Each zone is a button that jumps to
 * its chapter and moves focus there.
 *
 * Chapter offsets are measured on layout changes, never in the frame; the
 * frame writes only when the chapter changes — the carriage rides a CSS
 * scroll timeline (or, without one, the quantised progress, on change).
 */
export default function ZoneRuler() {
  const rootRef = useRef<HTMLElement>(null);
  const offsetsRef = useRef<SectionOffset[]>([]);
  const activeRef = useRef<string | null>(null);
  const progressRef = useRef(-1);
  const scrollDriven = useRef(false);

  useEffect(() => {
    scrollDriven.current = CSS.supports("animation-timeline: scroll()");
    let pending = 0;
    const measure = () => {
      pending = 0;
      const root = rootRef.current;
      offsetsRef.current = RULER_CHAPTERS.flatMap(({ id }) => {
        const el = document.getElementById(id);
        return el ? [{ id, top: documentTop(el) }] : [];
      });
      // Each zone's share of the page: from its chapter's top to the next one's.
      const end = document.documentElement.scrollHeight;
      const tops = offsetsRef.current.map((o) => o.top);
      root?.querySelectorAll<HTMLElement>(".zr-zone").forEach((zone, i) => {
        const len = Math.max(1, (tops[i + 1] ?? end) - (tops[i] ?? 0));
        zone.style.flexGrow = String(Math.round(len / 10));
      });
      activeRef.current = null;
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
    const active = activeSection(offsetsRef.current, y, window.innerHeight * 0.5) ?? RULER_CHAPTERS[0].id;
    if (active !== activeRef.current) {
      activeRef.current = active;
      root.querySelectorAll<HTMLElement>(".zr-zone").forEach((zone) => {
        if (zone.dataset.id === active) zone.setAttribute("data-current", "");
        else zone.removeAttribute("data-current");
      });
    }
    // Where CSS drives the carriage from the scroll itself, there's nothing to write.
    if (scrollDriven.current) return;
    const p = Math.round(progress * 500) / 500;
    if (p !== progressRef.current) {
      progressRef.current = p;
      root.style.setProperty("--p", String(p));
    }
  });

  const jump = (id: string) => {
    const section = document.getElementById(id);
    if (!section) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    section.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    if (!section.hasAttribute("tabindex")) section.setAttribute("tabindex", "-1");
    section.focus({ preventScroll: true });
  };

  return (
    <nav ref={rootRef} className="zone-ruler" aria-label="Chapters" data-skin="machined" suppressHydrationWarning>
      <ol className="zr-zones">
        {RULER_CHAPTERS.map((c) => (
          <li key={c.id} className="zr-zone" data-id={c.id}>
            <button type="button" onClick={() => jump(c.id)}>
              <span className="sr-only">
                Chapter {c.n}: {c.label}
              </span>
              <span className="zr-tip" aria-hidden="true">
                {c.n} {c.label}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <span className="zr-carriage" aria-hidden="true" />
    </nav>
  );
}
