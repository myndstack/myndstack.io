"use client";

import { useEffect, useRef } from "react";
import { useMediaQuery, useReducedMotion } from "@/lib/hooks";

/**
 * Must match `background-size` on `.field-grid` in globals.css — signals ride
 * the same lines the grid draws, so the two have to agree on the spacing.
 */
const GRID = 46;

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
 * The animated backdrop for the band below the hero.
 *
 * A faint blueprint grid and a few drifting lime glows (both pure CSS, in
 * globals.css) carry the look on every device; on desktop with motion allowed
 * this adds a canvas of lime "signals" that travel the grid lines with a fading
 * tail — the same visual language as the hero network's hopping pulses.
 *
 * Structured like `ParticleField`: no per-frame layout reads (dimensions are
 * cached), a debounced resize, and an `IntersectionObserver` that stops the RAF
 * whenever the band is off screen. Deliberately not a `lib/scroll.ts` subscriber
 * — it runs on its own clock, not the scroll position.
 *
 * Renders the static grid + glow under reduced motion; drops the canvas entirely
 * on mobile and under reduced motion.
 */
export default function SectionField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const isDesktop = useMediaQuery("(min-width: 47.5rem)");
  const animate = isDesktop && !reduced;

  useEffect(() => {
    if (!animate) return;

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
  }, [animate]);

  return (
    <div className="field" aria-hidden="true">
      <div className="field-grid" />
      {animate ? <canvas ref={canvasRef} className="field-canvas" /> : null}
      <div className="field-glows">
        <span className="field-glow field-glow-a" />
        <span className="field-glow field-glow-b" />
        <span className="field-glow field-glow-c" />
      </div>
    </div>
  );
}
