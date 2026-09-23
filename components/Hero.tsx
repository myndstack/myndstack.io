"use client";

import HeroNetwork, { PULSE_EVENT } from "./HeroNetwork";
import Magnetic from "./Magnetic";

const WORDS = ["Architected", "and", "built,", "end", "to", "end."];
/** The hard line break falls after this index: line one reads "Architected and
 *  built," and line two "end to end." — the promise, so the whole line stays lit. */
const BREAK_AFTER = 2;

/**
 * The headline words stay in code — the lit line and the hard line break after
 * `BREAK_AFTER` are written against that exact array. Everything else here is
 * editorial copy and arrives from the CMS.
 */
type Props = {
  eyebrow: string;
  subhead: string;
  ctaPrimary: string;
  ctaSecondary: string;
};

export default function Hero({ eyebrow, subhead, ctaPrimary, ctaSecondary }: Props) {
  // Hovering a CTA sends a burst of signals through the network behind it, plus
  // a shockwave that rolls out from the button's centre — so the detail carries
  // the CTA's viewport-space centre for HeroNetwork to convert to canvas coords.
  const burst = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    window.dispatchEvent(
      new CustomEvent(PULSE_EVENT, {
        detail: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      }),
    );
  };

  return (
    <header
      id="work"
      className="relative flex min-h-svh flex-col overflow-hidden border-b border-line"
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
        <div className="animate-rise-in mb-[26px] font-mono text-12 font-bold tracking-[0.16em] text-lime uppercase">
          {eyebrow}
        </div>

        <h1 className="animate-rise-in m-0 max-w-[1000px] font-display text-display leading-none font-normal tracking-[-0.03em] text-balance [animation-duration:0.7s]">
          {WORDS.map((word, i) => (
            // Index key: "end" appears twice, and the array is static.
            <span key={i}>
              <span className={`hero-word${i > BREAK_AFTER ? " is-lit" : ""}`}>{word}</span>
              {i === BREAK_AFTER ? <br /> : i < WORDS.length - 1 ? " " : null}
            </span>
          ))}
        </h1>

        <p className="animate-rise-in mx-0 mt-8 mb-[38px] max-w-[580px] text-22 leading-[1.5] text-t3 [animation-duration:0.8s]">
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

      <div
        aria-hidden="true"
        className="animate-rise-in relative z-2 flex justify-center pb-[30px] font-mono text-11 tracking-[0.14em] text-t5 [animation-duration:1s]"
      >
        SCROLL ↓
      </div>
    </header>
  );
}
