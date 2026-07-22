"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TESTIMONIALS } from "@/lib/content";
import { useReducedMotion } from "@/lib/hooks";
import Reveal from "./Reveal";
import Section from "./Section";
import SectionHeader from "./SectionHeader";

const INTERVAL_MS = 5000;

export default function Testimonials() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  /** Autoplay changes shouldn't be announced; only ones the user asked for. */
  const [announcement, setAnnouncement] = useState("");
  const timerRef = useRef<number | undefined>(undefined);

  const goTo = useCallback((n: number) => {
    setIndex(n);
    setAnnouncement(`Testimonial ${n + 1} of ${TESTIMONIALS.length}: ${TESTIMONIALS[n].name}`);
  }, []);

  useEffect(() => {
    if (reduced || paused) return;

    timerRef.current = window.setInterval(
      () => setIndex((i) => (i + 1) % TESTIMONIALS.length),
      INTERVAL_MS,
    );
    return () => window.clearInterval(timerRef.current);
  }, [reduced, paused, index]);

  return (
    <Section>
      <SectionHeader
        className="mb-11 max-w-[640px]"
        titleMaxWidth="640px"
        eyebrow="What partners say"
        title="The teams we build with, in their words."
      />

      <Reveal className="relative">
        <div
          role="group"
          aria-roledescription="carousel"
          aria-label="Partner testimonials"
          // Hovering or focusing within the slider holds the current quote.
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <div className="overflow-hidden">
            <div
              className="ease-brand flex transition-transform duration-500"
              style={{ transform: `translateX(${-index * 100}%)` }}
            >
              {TESTIMONIALS.map((t, i) => (
                <div
                  key={t.name}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${TESTIMONIALS.length}`}
                  // Off-screen slides stay out of the a11y tree and tab order.
                  inert={i !== index}
                  className="flex min-w-full justify-center px-px"
                >
                  {/* The lime edge doubles as the affordance that hovering pauses. */}
                  <figure className="ease-brand m-0 flex min-h-[210px] w-full max-w-[900px] flex-col gap-[30px] border border-line bg-surface-3 px-5 py-9 transition-[border-color,box-shadow] duration-160 hover:border-lime-edge hover:shadow-[0_0_0_1px_rgba(201,242,77,.08),0_14px_34px_rgba(0,0,0,.45)] sm:px-[50px] sm:py-[46px]">
                    <blockquote className="m-0 font-display text-[21px] leading-[1.42] font-medium text-t1 text-pretty sm:text-[27px]">
                      {t.quote}
                    </blockquote>
                    <figcaption className="flex items-center gap-3.5">
                      <div
                        aria-hidden="true"
                        className="flex size-[46px] items-center justify-center border border-line-3 bg-ink font-display text-base font-bold text-lime"
                      >
                        {t.initials}
                      </div>
                      <div>
                        <div className="text-[15px] font-semibold">{t.name}</div>
                        <div className="text-[13px] text-t5">{t.role}</div>
                      </div>
                    </figcaption>
                  </figure>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-[26px] flex justify-center gap-[9px]">
            {TESTIMONIALS.map((t, i) => (
              <button
                key={t.name}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show testimonial ${i + 1}: ${t.name}`}
                aria-current={i === index}
                className="ease-brand h-1 cursor-pointer border-none p-0 transition-[width,background-color] duration-200"
                style={{
                  width: i === index ? 34 : 22,
                  background: i === index ? "#C9F24D" : "#2E2E34",
                }}
              />
            ))}
          </div>
        </div>

        <p className="sr-only" role="status">
          {announcement}
        </p>
      </Reveal>
    </Section>
  );
}
