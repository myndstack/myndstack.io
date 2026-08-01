"use client";

import { useEffect, useRef } from "react";
import { useMediaQuery, useReducedMotion } from "@/lib/hooks";

/**
 * Must match `background-size` on `.field-grid` in globals.css — signals ride
 * the same lines the grid draws, so the two have to agree on the spacing.
 */
const GRID = 30;

/** Signals per (width + height) pixel. Sparse on purpose — this is a backdrop. */
const DENSITY = 1 / 64;
const HEAD_ALPHA = 0.6;
const MIN_SPEED = 0.8;
const MAX_SPEED = 2.2;
const MIN_TAIL = 38;
const MAX_TAIL = 90;

type Axis = "h" | "v";
type Signal = {
  axis: Axis;
  /** The cross-axis grid line this signal rides, in CSS px. */
  line: number;
  /** Position along the axis of travel, in CSS px. */
  pos: number;
  dir: 1 | -1;
  speed: number;
  tail: number;
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * The animated backdrop for the stack story.
 *
 * A faint blueprint grid (pure CSS, in globals.css) carries the look on every
 * device; on desktop with motion allowed this adds a canvas of lime "signals"
 * that travel the grid lines with a fading tail — the same visual language as
 * the hero network's hopping pulses — plus a cursor spotlight that brightens
 * the grid cells under the pointer.
 *
 * Structured like `ParticleField`: no per-frame layout reads (dimensions are
 * cached), a debounced resize, and an `IntersectionObserver` that stops the RAF
 * whenever the band is off screen. Deliberately not a `lib/scroll.ts` subscriber
 * — it runs on its own clock, not the scroll position.
 *
 * Renders the static grid alone under reduced motion and on mobile.
 */
export default function SectionField({
  signals = false,
}: {
  /** Run the travelling-signal canvas. Off by default — static bands are pure CSS. */
  signals?: boolean;
} = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const isDesktop = useMediaQuery("(min-width: 47.5rem)");
  // The canvas only mounts for a signals band on desktop with motion allowed;
  // everything else is the CSS grid + glow, which costs nothing to animate.
  const runSignals = signals && isDesktop && !reduced;

  useEffect(() => {
    if (!runSignals) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let signals: Signal[] = [];

    /** A fresh signal entering from just off the leading edge of its line. */
    const spawn = (): Signal => {
      const axis: Axis = Math.random() < 0.5 ? "h" : "v";
      const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      const span = axis === "h" ? w : h;
      const cross = axis === "h" ? h : w;
      const tail = rand(MIN_TAIL, MAX_TAIL);
      return {
        axis,
        // Snap onto an actual grid line so the signal sits on a drawn edge.
        line: Math.round(rand(0, cross) / GRID) * GRID,
        pos: dir > 0 ? -tail : span + tail,
        dir,
        speed: rand(MIN_SPEED, MAX_SPEED),
        tail,
      };
    };

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round((w + h) * DENSITY);
      signals = Array.from({ length: count }, spawn);
    };
    resize();

    // Resize fires continuously while a window is dragged; settle then rebuild.
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 160);
    };
    window.addEventListener("resize", onResize, { passive: true });

    let raf = 0;
    let visible = true;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < signals.length; i++) {
        const s = signals[i];
        s.pos += s.dir * s.speed;

        // Head and tail endpoints, along the axis of travel.
        const headAlong = s.pos;
        const tailAlong = s.pos - s.dir * s.tail;
        const hx = s.axis === "h" ? headAlong : s.line;
        const hy = s.axis === "h" ? s.line : headAlong;
        const tx = s.axis === "h" ? tailAlong : s.line;
        const ty = s.axis === "h" ? s.line : tailAlong;

        const grad = ctx.createLinearGradient(tx, ty, hx, hy);
        grad.addColorStop(0, "rgba(201,242,77,0)");
        grad.addColorStop(1, `rgba(201,242,77,${HEAD_ALPHA})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(hx, hy);
        ctx.stroke();

        ctx.fillStyle = `rgba(201,242,77,${HEAD_ALPHA + 0.2})`;
        ctx.beginPath();
        ctx.arc(hx, hy, 1.9, 0, Math.PI * 2);
        ctx.fill();

        // Fully past the far edge (head and tail both gone) → recycle.
        const span = s.axis === "h" ? w : h;
        const gone = s.dir > 0 ? tailAlong > span : tailAlong < 0;
        if (gone) signals[i] = spawn();
      }

      raf = visible ? requestAnimationFrame(draw) : 0;
    };

    // Stop burning frames once the band scrolls out of view.
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !raf) draw();
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    draw();

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
    };
  }, [runSignals]);

  // Cursor spotlight: brighten the grid cells under the pointer. Hover-only, so
  // it's gated to desktop (touch has no hover) and skipped under reduced motion.
  // Writes two CSS custom properties on the field per move (coalesced to one
  // rAF); the brightening itself is a masked opacity layer in CSS. Not a
  // lib/scroll.ts subscriber — it runs off pointer events, on its own clock.
  //
  // The geometry is CACHED, refreshed by a ResizeObserver — the same discipline
  // as Nav and StackStory. The first version called getBoundingClientRect()
  // inside the per-move rAF, and a trackpad scroll with the cursor over the
  // pinned section put that read in the same frames as the nav's class writes:
  // exactly the forced-synchronous-layout interleaving lib/scroll.ts exists to
  // prevent.
  //
  // A plain cached origin isn't enough, though: the field fills the STICKY box,
  // which moves in document space while pinned. Its viewport top is instead
  // derived from scroll-invariant section geometry — in flow it sits at the
  // section top, pins at 0, and leaves with the section bottom — so the
  // per-move work is arithmetic on `scrollY`, which reads scroll position
  // without forcing layout.
  useEffect(() => {
    if (!isDesktop || reduced) return;
    const field = fieldRef.current;
    const sticky = field?.parentElement;
    const section = field?.closest("section");
    if (!field || !sticky || !section) return;

    let leftDoc = 0;
    let sectionTopDoc = 0;
    let sectionH = 0;
    let stickyH = 0;
    let pendingMeasure = 0;
    const measure = () => {
      pendingMeasure = 0;
      const r = section.getBoundingClientRect();
      leftDoc = r.left + window.scrollX;
      sectionTopDoc = r.top + window.scrollY;
      sectionH = section.offsetHeight;
      stickyH = sticky.offsetHeight;
    };
    const scheduleMeasure = () => {
      if (pendingMeasure) return;
      pendingMeasure = requestAnimationFrame(measure);
    };
    measure();
    document.fonts?.ready.then(scheduleMeasure);
    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(document.body);

    let raf = 0;
    let px = 0;
    let py = 0;
    let hot = false;
    const apply = () => {
      raf = 0;
      const y = window.scrollY;
      // Where the sticky box's top edge sits in the viewport right now.
      const flowTop = sectionTopDoc - y;
      const endTop = sectionTopDoc + sectionH - stickyH - y;
      const stickyTop = Math.min(endTop, Math.max(0, flowTop));
      field.style.setProperty("--fx", `${px + window.scrollX - leftDoc}px`);
      field.style.setProperty("--fy", `${py - stickyTop}px`);
    };
    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      // Gated, not unconditional: classList.add on every move is a DOM write
      // per frame, which the MutationObserver browser test exists to catch.
      if (!hot) {
        hot = true;
        field.classList.add("is-hot");
      }
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      hot = false;
      field.classList.remove("is-hot");
    };

    section.addEventListener("pointermove", onMove, { passive: true });
    section.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      observer.disconnect();
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
      if (pendingMeasure) cancelAnimationFrame(pendingMeasure);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isDesktop, reduced]);

  return (
    <div className="field" aria-hidden="true" ref={fieldRef}>
      <div className="field-grid" />
      {/* Bright grid, revealed only inside the cursor spotlight (see globals.css). */}
      <div className="field-grid-hot" />
      {runSignals ? <canvas ref={canvasRef} className="field-canvas" /> : null}
    </div>
  );
}
