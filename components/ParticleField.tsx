"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/hooks";

const MAX_PARTICLES = 130;
/** One particle per this many square px, capped at MAX_PARTICLES. */
const AREA_PER_PARTICLE = 17000;
/**
 * Link-drawing is O(n²) — 130 particles is ~8,400 distance checks per frame.
 * That's fine on a laptop and not fine on a budget phone, so the cap drops on
 * devices that report few cores.
 */
const LOW_END_MAX_PARTICLES = 60;
const LOW_END_CORE_COUNT = 4;
/** Particles closer than this get a connecting line. */
const LINK_DISTANCE = 115;
const DRIFT = 0.32;
const PARALLAX = 0.025;
const PARALLAX_EASE = 0.06;
const HOVER_RADIUS = 90;

type Particle = { x: number; y: number; vx: number; vy: number };

/**
 * Drifting constellation behind the hero. Pauses entirely when scrolled away.
 *
 * `dim` fades the whole field back — used on mobile, where this stands in for the
 * desktop WebGL network and should read as a faint texture, not a focal point.
 */
export default function ParticleField({ dim = false }: { dim?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const cap =
      (navigator.hardwareConcurrency ?? 8) <= LOW_END_CORE_COUNT
        ? LOW_END_MAX_PARTICLES
        : MAX_PARTICLES;
    const count = Math.min(cap, Math.round((w * h) / AREA_PER_PARTICLE));
    const particles: Particle[] = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * DRIFT,
      vy: (Math.random() - 0.5) * DRIFT,
    }));

    const scatter = () => {
      resize();
      for (const p of particles) {
        p.x = Math.random() * w;
        p.y = Math.random() * h;
      }
    };

    // Re-spread once layout settles, and again after the loader clears.
    const settle1 = window.setTimeout(scatter, 300);
    const settle2 = window.setTimeout(scatter, 1800);
    // Settle before rebuilding: resize fires continuously while dragging.
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(scatter, 150);
    };
    window.addEventListener("resize", onResize, { passive: true });

    const mouse: { x: number | null; y: number | null } = { x: null, y: null };
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);

    let raf = 0;
    let visible = true;
    let offsetX = 0;
    let offsetY = 0;
    const linkDistanceSq = LINK_DISTANCE * LINK_DISTANCE;

    const draw = () => {
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        // Reflect at the edges without letting velocity accumulate — otherwise
        // the field slowly clumps into the corners.
        if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx); }
        if (p.x > w) { p.x = w; p.vx = -Math.abs(p.vx); }
        if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy); }
        if (p.y > h) { p.y = h; p.vy = -Math.abs(p.vy); }
      }

      const targetX = mouse.x != null ? (mouse.x - w / 2) * PARALLAX : 0;
      const targetY = mouse.y != null ? (mouse.y - h / 2) * PARALLAX : 0;
      offsetX += (targetX - offsetX) * PARALLAX_EASE;
      offsetY += (targetY - offsetY) * PARALLAX_EASE;

      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.lineWidth = 1;

      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 >= linkDistanceSq) continue;

          const alpha = (1 - Math.sqrt(d2) / LINK_DISTANCE) * 0.14;
          ctx.strokeStyle = `rgba(201,242,77,${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      for (const p of particles) {
        const near =
          mouse.x != null &&
          mouse.y != null &&
          Math.hypot(mouse.x - offsetX - p.x, mouse.y - offsetY - p.y) < HOVER_RADIUS;

        ctx.fillStyle = near ? "rgba(201,242,77,.9)" : "rgba(255,255,255,.45)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, near ? 2.3 : 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      raf = visible ? requestAnimationFrame(draw) : 0;
    };

    // Stop burning frames once the hero scrolls out of view.
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
      window.clearTimeout(settle1);
      window.clearTimeout(settle2);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`absolute inset-0 z-0 h-full w-full${dim ? " opacity-[0.55]" : ""}`}
    />
  );
}
