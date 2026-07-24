"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/lib/hooks";
import HeroNetwork, { PULSE_EVENT } from "./HeroNetwork";
import Magnetic from "./Magnetic";

const WORDS = ["Intelligence", "that", "runs", "on infrastructure."];
const CYCLE_MS = 1400;
// Non-breaking space keeps the lime last line from wrapping mid-phrase.
const LAST = WORDS.length - 1;

/**
 * The headline words stay in code — the cycle animation and the hard line break
 * after index 2 are written against that exact array. Everything else here is
 * editorial copy and arrives from the CMS.
 */
type Props = {
  eyebrow: string;
  subhead: string;
  ctaPrimary: string;
  ctaSecondary: string;
};

export default function Hero({ eyebrow, subhead, ctaPrimary, ctaSecondary }: Props) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % WORDS.length),
      CYCLE_MS,
    );
    return () => window.clearInterval(id);
  }, [reduced]);

  // Hovering a CTA sends a burst of signals through the network behind it.
  const burst = () => window.dispatchEvent(new Event(PULSE_EVENT));

  // At rest the design lights the final line; the cycle walks the accent instead.
  const lit = reduced ? LAST : index;

  return (
    <header
      id="work"
      className="relative flex min-h-screen flex-col overflow-hidden border-b border-line"
    >
      {/* Mobile-only blueprint texture: a faint dot lattice behind everything,
          fading at the edges so it's densest under the headline. Hidden at ≥760px,
          where the WebGL network carries the depth. Static — no motion, no cost. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 sm:hidden"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.09) 1px, transparent 1.6px)",
          backgroundSize: "20px 20px",
          maskImage:
            "radial-gradient(ellipse 80% 62% at 50% 42%, #000 38%, transparent 86%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 62% at 50% 42%, #000 38%, transparent 86%)",
        }}
      />

      <HeroNetwork />

      <div className="relative z-2 flex flex-1 flex-col items-center justify-center px-5 pt-[calc(60px+var(--nav-height))] pb-[60px] text-center sm:px-16">
        <div className="animate-rise-in mb-[26px] font-mono text-xs font-bold tracking-[0.16em] text-lime uppercase">
          {eyebrow}
        </div>

        <h1 className="animate-rise-in m-0 max-w-[1000px] font-display text-[clamp(30px,7.2vw,92px)] leading-none font-normal tracking-[-0.03em] text-balance [animation-duration:0.7s]">
          {WORDS.map((word, i) => (
            <span key={word}>
              <span className={`hero-word${i === lit ? " is-lit" : ""}`}>{word}</span>
              {i === 2 ? <br /> : i < LAST ? " " : null}
            </span>
          ))}
        </h1>

        <p className="animate-rise-in mx-0 mt-8 mb-[38px] max-w-[580px] text-[21px] leading-[1.5] text-t3 [animation-duration:0.8s]">
          {subhead}
        </p>

        <div className="animate-rise-in flex flex-wrap justify-center gap-3.5 [animation-duration:0.9s]">
          <Magnetic>
            <a href="#contact" className="btn btn-lime" onMouseEnter={burst}>
              {ctaPrimary}
            </a>
          </Magnetic>
          <Magnetic>
            <a href="#work-cases" className="btn btn-outline" onMouseEnter={burst}>
              {ctaSecondary}
            </a>
          </Magnetic>
        </div>
      </div>

      <div className="animate-rise-in relative z-2 flex justify-center pb-[30px] font-mono text-[11px] tracking-[0.14em] text-t7 [animation-duration:1s]">
        SCROLL ↓
      </div>
    </header>
  );
}
