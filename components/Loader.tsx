"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useReducedMotion } from "@/lib/hooks";
import { LOADER_SEEN_KEY } from "@/lib/loader-seen";
import Wordmark from "./Wordmark";

const FADE_AT_MS = 1650;
const FADE_DURATION_MS = 850;
const SPARK_COUNT = 90;
const SPARK_FRAMES = 80;

/** sessionStorage throws outright in some privacy modes; a throw means unseen. */
function alreadySeen() {
  try {
    return window.sessionStorage.getItem(LOADER_SEEN_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * "Has the intro already played this session?" is a client-only fact that must
 * not change the hydrated markup, so it is read as an external store: `false` on
 * the server and during hydration, the real value immediately after. It never
 * changes again within a page load, hence the no-op subscribe.
 *
 * Deliberately not `useState` + `useEffect` — that set-state-inside-an-effect is
 * the cascade React's lint rules now reject, and it also meant `inert` was set
 * and then released a render later on repeat visits.
 */
const subscribeNever = () => () => {};
const neverSeenOnServer = () => false;

/** Full-screen cinematic intro with a one-shot particle "ignite" burst. */
export default function Loader() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fading, setFading] = useState(false);
  const [finished, setFinished] = useState(false);

  const reduced = useReducedMotion();
  const seen = useSyncExternalStore(subscribeNever, alreadySeen, neverSeenOnServer);

  /**
   * Skip the entrance entirely under reduced motion, or if it already played
   * this session. Both are derived rather than pushed into state, so a repeat
   * visit is `gone` on its very first client render — it never touches `inert`
   * or starts the canvas and then undoes it a render later.
   */
  const skip = reduced || seen;
  const gone = skip || finished;

  useEffect(() => {
    if (skip) return;

    // Claimed now rather than when the entrance finishes: navigating away
    // mid-entrance must not replay it on the next full page load.
    try {
      window.sessionStorage.setItem(LOADER_SEEN_KEY, "1");
    } catch {
      // Nothing to do — the entrance simply plays again next time.
    }

    const fadeTimer = window.setTimeout(() => setFading(true), FADE_AT_MS);
    const removeTimer = window.setTimeout(
      () => setFinished(true),
      FADE_AT_MS + FADE_DURATION_MS,
    );

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, [skip]);

  /**
   * Hold the page inert while the overlay covers it: it is opaque, so tabbing
   * behind it would move focus to things nobody can see, and `aria-hidden` on
   * the overlay does not prevent that.
   *
   * Only ever set while the overlay is actually being shown. Setting it
   * unconditionally and releasing it on `gone` is what left the whole page
   * uninteractive once before, and on a repeat visit there is no overlay to
   * hold anything back from.
   *
   * Keyed on `gone` rather than released in an unmount cleanup — this component
   * finishes by rendering null, it does not unmount, so a cleanup-based release
   * never runs.
   */
  useEffect(() => {
    if (gone) return;

    const site = document.getElementById("site");
    if (!site) return;

    site.inert = true;
    return () => {
      site.inert = false;
    };
  }, [gone]);

  useEffect(() => {
    if (gone) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = w / 2;
    const cy = h / 2;
    const sparks = Array.from({ length: SPARK_COUNT }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3.4;
      return {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      };
    });

    let frame = 0;
    let raf = 0;

    const tick = () => {
      frame++;
      ctx.clearRect(0, 0, w, h);

      const alpha = Math.max(0, 0.7 - frame / SPARK_FRAMES);
      ctx.fillStyle = `rgba(201,242,77,${alpha})`;

      for (const s of sparks) {
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.985;
        s.vy *= 0.985;

        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      if (frame < SPARK_FRAMES) raf = requestAnimationFrame(tick);
    };

    tick();
    return () => cancelAnimationFrame(raf);
  }, [gone]);

  if (gone) return null;

  return (
    <div
      className="loader ease-brand fixed inset-0 z-200 flex flex-col items-center justify-center gap-[26px] bg-ink transition-opacity duration-[800ms]"
      style={{ opacity: fading ? 0 : 1 }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-60" />
      <Wordmark height={44} className="relative z-2 animate-load-mark" />
      <div className="animate-load-line relative z-2 h-0.5 bg-lime shadow-[0_0_14px_#C9F24D]" />
      <div className="animate-load-fade relative z-2 font-mono text-[11px] font-bold tracking-[0.22em] text-t7 uppercase">
        Initializing cognitive stack
      </div>
    </div>
  );
}
