"use client";

import { useEffect, useState } from "react";
import { MANIFESTO_KEEP, MANIFESTO_LEAD } from "@/lib/content";
import { useInView, useReducedMotion } from "@/lib/hooks";

/** Delay between each word lighting up. */
const STEP_MS = 55;

const WORDS = MANIFESTO_LEAD.trim().split(/\s+/);

/** Oversized statement whose words brighten one at a time on entry. */
export default function Manifesto() {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView<HTMLParagraphElement>(0.55);
  const [litCount, setLitCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setLitCount(WORDS.length);
      return;
    }

    const timers = WORDS.map((_, i) =>
      window.setTimeout(() => setLitCount(i + 1), i * STEP_MS),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [inView, reduced]);

  return (
    <section className="mx-auto max-w-[1120px] px-5 py-28 sm:px-14">
      <div className="eyebrow mb-[26px] tracking-[0.16em]">Manifesto</div>
      <p
        ref={ref}
        className="m-0 font-display text-[30px] leading-[1.16] font-medium tracking-[-0.02em] text-balance sm:text-[50px]"
      >
        {WORDS.map((word, i) => (
          <span
            key={`${word}-${i}`}
            className={`manifesto-word${i < litCount ? " is-lit" : ""}`}
          >
            {word}{" "}
          </span>
        ))}
        <span className="text-lime">{MANIFESTO_KEEP}</span>
      </p>
    </section>
  );
}
