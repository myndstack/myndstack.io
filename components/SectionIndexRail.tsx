"use client";

import { useEffect, useRef } from "react";
import { useScrollFrame } from "@/lib/hooks";
import { activeSection, type SectionOffset } from "@/lib/scroll-spy";

/** Fallback spy line if `--nav-offset` can't be read; overridden each measure. */
const SPY_LINE_FALLBACK = 96;

/**
 * Absolute document top of a header, summed up the `offsetParent` chain.
 *
 * `offsetTop` is a *layout* position, so — unlike `getBoundingClientRect()` — it
 * ignores the `translateY` a `.reveal` puts on a not-yet-entered header. That
 * means the offsets are correct from first measure, before anything has revealed,
 * and a reveal landing (a transform, no reflow) never needs re-measuring. Summed
 * because the marker sits inside positioned section wrappers, so its own
 * `offsetTop` is relative to those, not the document.
 */
function documentTop(el: HTMLElement): number {
  let top = 0;
  let node: HTMLElement | null = el;
  while (node) {
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return top;
}

/**
 * Lights the current section's ordinal in the editorial index rail (the mono
 * numbers `.ms-index` puts on each SectionHeader). No markup of its own: it reads
 * the one shared scroll loop and toggles `.is-current` on the active marker,
 * exactly the way Nav drives its scroll-spy — offsets cached out of the frame
 * (measured on mount, font swap and any body resize), the frame itself doing
 * arithmetic plus a single class flip, only when the active section changes.
 *
 * Homepage-only: that's the only route with SectionHeaders, so on any other page
 * `.ms-index` finds nothing and the frame no-ops. Renders null.
 */
export default function SectionIndexRail() {
  /** The marker elements, and the last index actually lit. */
  const elsRef = useRef<HTMLElement[]>([]);
  const offsetsRef = useRef<SectionOffset[]>([]);
  const lineRef = useRef(SPY_LINE_FALLBACK);
  const appliedRef = useRef<string | null>(null);

  useEffect(() => {
    let pending = 0;

    const measure = () => {
      pending = 0;
      // Same activation line as the nav spy, so the two agree where a section is
      // both a nav target and an index entry.
      const line = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--nav-offset"),
      );
      if (!Number.isNaN(line)) lineRef.current = line;

      elsRef.current = Array.from(
        document.querySelectorAll<HTMLElement>(".ms-index"),
      );
      offsetsRef.current = elsRef.current.map((el, i) => ({
        id: String(i),
        top: documentTop(el),
      }));
    };

    /** Layout can settle in bursts; one measurement per frame is plenty. */
    const schedule = () => {
      if (pending) return;
      pending = requestAnimationFrame(measure);
    };

    measure();
    // Font swap shifts every header down the page.
    document.fonts?.ready.then(schedule);

    // Reveals landing don't move layout (they're transforms), but an accordion
    // opening, an image settling or a resize do.
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);

    return () => {
      observer.disconnect();
      if (pending) cancelAnimationFrame(pending);
    };
  }, []);

  useScrollFrame(({ y }) => {
    if (offsetsRef.current.length === 0) return;

    const active = activeSection(offsetsRef.current, y, lineRef.current);
    if (active === appliedRef.current) return;

    // Exactly two writes, and only when the active section changes: unlight the
    // old marker, light the new one.
    if (appliedRef.current !== null) {
      elsRef.current[Number(appliedRef.current)]?.classList.remove("is-current");
    }
    if (active !== null) {
      elsRef.current[Number(active)]?.classList.add("is-current");
    }
    appliedRef.current = active;
  });

  return null;
}
