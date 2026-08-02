"use client";

import { useEffect, useRef } from "react";
import { STACK_LAYERS } from "@/lib/content";
import { useReducedMotion, useScrollFrame } from "@/lib/hooks";
import SectionField from "./SectionField";

/** Vertical pitch between locked tiles, and where the stack starts. */
const GAP = 106;
const BASE_Y = 18;
/** How far apart the tiles start, before they assemble. */
const SPREAD_Y = 140;
const OFFSET_X = 120;
/** Each layer starts 0.14 of the scroll after the previous, over a 0.4 window. */
const STAGGER = 0.14;
const WINDOW = 0.4;
/** A layer lights up once it's this far through its own window. */
const LOCK_AT = 0.6;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export default function StackStory() {
  const sectionRef = useRef<HTMLElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const reduced = useReducedMotion();

  /**
   * The pinned section's geometry. Measured on layout changes rather than per
   * frame — `offsetHeight` and `getBoundingClientRect()` in the scroll frame
   * forced a synchronous layout on top of whatever the nav had just written.
   * `top` is document-absolute, so scrolling never invalidates it.
   *
   * It must be `getBoundingClientRect().top + scrollY`, NOT `offsetTop`:
   * `offsetTop` is relative to the nearest positioned ancestor, so any wrapper
   * with `position: relative` silently rebases it — which happened when the
   * section briefly lived inside a positioned backdrop wrapper: `offsetTop`
   * read ~0, the progress ran far ahead of the scroll, and the tiles finished
   * assembling before the section even pinned. The rect is unaffected by any
   * offsetParent, so this survives future re-wrapping.
   */
  const geometryRef = useRef({ top: 0, total: 0 });

  useEffect(() => {
    let pending = 0;

    const measure = () => {
      pending = 0;
      const section = sectionRef.current;
      if (!section) return;
      geometryRef.current = {
        top: section.getBoundingClientRect().top + window.scrollY,
        total: section.offsetHeight - window.innerHeight,
      };
    };

    const schedule = () => {
      if (pending) return;
      pending = requestAnimationFrame(measure);
    };

    measure();
    document.fonts?.ready.then(schedule);

    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);

    return () => {
      observer.disconnect();
      if (pending) cancelAnimationFrame(pending);
    };
  }, []);

  /**
   * Reduced motion: the assembly is a scroll-driven animation (WCAG 2.3.3), and
   * the tiles are positioned with inline transforms that the global CSS
   * reduce-rule can't reach. So place every tile in its assembled rest state once
   * and let the scroll frame below bail out — no scatter, no fly-in, just the
   * finished stack.
   */
  useEffect(() => {
    if (!reduced) return;
    layerRefs.current.forEach((el, k) => {
      if (!el) return;
      el.style.transform = `translate(0px, ${BASE_Y + k * GAP}px) scale(1)`;
      el.style.opacity = "1";
      el.classList.add("is-locked");
    });
    if (counterRef.current) {
      counterRef.current.textContent = `0${STACK_LAYERS.length} / 0${STACK_LAYERS.length}`;
    }
  }, [reduced]);

  useScrollFrame(({ y }) => {
    // Under reduced motion the tiles are pre-assembled by the effect above; don't
    // drive the scatter/fly-in per scroll frame.
    if (reduced) return;

    const { top, total } = geometryRef.current;
    if (total <= 0) return;

    const progress = Math.min(1, Math.max(0, (y - top) / total));

    let active = 0;

    layerRefs.current.forEach((el, k) => {
      if (!el) return;

      const raw = Math.min(1, Math.max(0, (progress - k * STAGGER) / WINDOW));
      const eased = easeOutCubic(raw);

      const scatterY = (k - (STACK_LAYERS.length - 1) / 2) * SPREAD_Y;
      const scatterX = (k % 2 ? 1 : -1) * OFFSET_X;
      const restY = BASE_Y + k * GAP;
      const scale = 0.955 + 0.045 * eased;

      el.style.transform =
        `translate(${(scatterX * (1 - eased)).toFixed(1)}px, ` +
        `${(restY + scatterY * (1 - eased)).toFixed(1)}px) ` +
        `scale(${scale.toFixed(3)})`;
      // Start fully transparent, not at a 0.1 floor: the old floor left every
      // un-assembled tile as faint ghost text scattered across the panel before
      // its turn came — which the brighter field behind only made louder. Each
      // tile now fades up from nothing as it assembles.
      el.style.opacity = eased.toFixed(2);

      const locked = raw > LOCK_AT;
      el.classList.toggle("is-locked", locked);
      if (raw > 0.5) active = k;
    });

    if (counterRef.current) {
      counterRef.current.textContent = `0${active + 1} / 0${STACK_LAYERS.length}`;
    }
  });

  return (
    <section
      ref={sectionRef}
      id="platform"
      // No border-bottom on purpose: the section ends on the field's soft
      // vertical mask (see `.field` in globals.css), so it dissolves into the
      // plain ink of the section below rather than terminating on a hard line.
      className="relative min-h-[70vh] sm:h-[340vh]"
    >
      {/* The Hybrid A+B field (grid + travelling signals + cursor spotlight) is
          this section's signature backdrop — placed INSIDE the sticky element,
          because an overflow-hidden *ancestor* of a sticky box breaks the pin.
          `isolate` contains the field's z-0; the `overflow-hidden` here is on
          the sticky box itself, which is fine for the pin and clips the field.

          `data-sticky` marks this as the pinned box: SectionField's cursor
          spotlight uses `.closest('[data-sticky]')` to find the sticky rather
          than assuming `parentElement`, so an intermediate wrapper doesn't
          silently misalign the coordinate math. */}
      <div
        data-sticky
        className="relative isolate flex min-h-[70vh] items-center overflow-hidden py-16 sm:sticky sm:top-0 sm:h-screen sm:py-0"
      >
        <SectionField signals />

        <div className="relative z-1 mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-16 px-5 sm:px-14 md:grid-cols-[1.05fr_1fr]">
          <div>
            <div className="eyebrow mb-5 tracking-[0.16em]">
              The stack · <span ref={counterRef}>01 / 04</span>
            </div>
            <h2 className="m-0 mb-[22px] font-display text-[42px] leading-[0.98] font-bold tracking-[-0.03em] text-balance sm:text-[76px]">
              One stack.
              <br />
              Every layer.
            </h2>
            <p className="m-0 max-w-[420px] text-[19px] leading-[1.55] text-t4">
              Scroll to assemble the cognitive stack — data, compute, models, and
              interface, unified behind one API.
            </p>
          </div>

          <div className="relative hidden h-[452px] sm:block">
            {STACK_LAYERS.map((layer, i) => (
              <div
                key={layer.n}
                ref={(el) => {
                  layerRefs.current[i] = el;
                }}
                className="story-layer absolute inset-x-0 flex h-[98px] items-center gap-5 overflow-hidden border border-line bg-surface-2 px-[26px]"
              >
                <span className="ease-brand absolute inset-y-0 left-0 w-[3px] origin-top scale-y-0 bg-lime transition-transform duration-350 [.is-locked_&]:scale-y-100" />
                <span className="ease-brand flex-none font-mono text-xs font-bold text-t7 transition-colors [.is-locked_&]:text-lime">
                  {layer.n}
                </span>
                <span className="flex-1 font-display text-2xl font-semibold">
                  {layer.title}
                </span>
                <span className="font-mono text-xs text-t5">{layer.meta}</span>
                <span className="ease-brand size-2 flex-none bg-line-3 transition-[background-color,box-shadow] duration-300 [.is-locked_&]:bg-lime [.is-locked_&]:shadow-[0_0_10px_#C9F24D]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
