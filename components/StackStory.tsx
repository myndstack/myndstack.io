"use client";

import { useRef } from "react";
import { STACK_LAYERS } from "@/lib/content";
import { useScrollFrame } from "@/lib/hooks";

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

  useScrollFrame(() => {
    const section = sectionRef.current;
    if (!section) return;

    const total = section.offsetHeight - window.innerHeight;
    if (total <= 0) return;

    const progress = Math.min(
      1,
      Math.max(0, -section.getBoundingClientRect().top / total),
    );

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
      el.style.opacity = (0.1 + 0.9 * eased).toFixed(2);

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
      className="relative min-h-[70vh] border-b border-line sm:h-[340vh]"
    >
      <div className="relative flex min-h-[70vh] items-center overflow-hidden py-16 sm:sticky sm:top-0 sm:h-screen sm:py-0">
        {/* Blueprint grid, faded out away from the stack */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(#141418 1px, transparent 1px), linear-gradient(90deg, #141418 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(circle at 70% 50%, #000, transparent 78%)",
            WebkitMaskImage: "radial-gradient(circle at 70% 50%, #000, transparent 78%)",
          }}
        />

        <div className="relative mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-16 px-5 sm:px-14 md:grid-cols-[1.05fr_1fr]">
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
