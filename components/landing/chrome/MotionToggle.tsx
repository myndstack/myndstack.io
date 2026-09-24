"use client";

import { useState } from "react";

/**
 * Pauses every loop on the page (the engine's idle motion, the demos, the
 * document scan) — WCAG 2.2.2. Scroll-driven motion stays: it only moves when
 * you do.
 */
export default function MotionToggle() {
  const [paused, setPaused] = useState(false);
  return (
    <button
      type="button"
      className="tb-link"
      aria-pressed={paused}
      onClick={() => {
        const next = !paused;
        setPaused(next);
        if (next) document.documentElement.dataset.paused = "";
        else delete document.documentElement.dataset.paused;
      }}
    >
      {paused ? "▶ Motion" : "❚❚ Motion"}
    </button>
  );
}
