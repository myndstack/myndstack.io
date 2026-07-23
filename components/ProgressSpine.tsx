"use client";

import { useRef } from "react";
import { useScrollFrame } from "@/lib/hooks";
import { SOCIALS } from "@/lib/content";
import SocialIcon from "./SocialIcon";

/** Where the hairline starts and how much room the socials need at the bottom. */
const TRACK_TOP = 170;
const TRACK_BOTTOM_GAP = 188;

/** Fixed left rail: page-scroll progress plus social links. Hidden under 1100px. */
export default function ProgressSpine() {
  const fillRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useScrollFrame(({ progress }) => {
    const span = Math.max(0, window.innerHeight - TRACK_TOP - TRACK_BOTTOM_GAP);
    if (fillRef.current) fillRef.current.style.height = `${progress * span}px`;
    if (dotRef.current) dotRef.current.style.top = `${TRACK_TOP + progress * span}px`;
  });

  return (
    <div className="pointer-events-none fixed inset-y-0 left-0 z-58 hidden w-16 lg:block">
      <div
        className="absolute top-[100px] left-1/2 -translate-x-1/2 font-mono text-[10px] font-bold tracking-[0.22em] text-t7 uppercase"
        style={{ writingMode: "vertical-rl" }}
      >
        Follow
      </div>

      <div
        className="absolute left-1/2 w-px -translate-x-1/2 bg-line"
        style={{ top: TRACK_TOP, bottom: TRACK_BOTTOM_GAP }}
      />
      <div
        ref={fillRef}
        className="absolute left-1/2 h-0 w-0.5 -translate-x-1/2 bg-lime shadow-[0_0_8px_#C9F24D] transition-[height] duration-[120ms] ease-linear"
        style={{ top: TRACK_TOP }}
      />
      <div
        ref={dotRef}
        className="absolute left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 bg-lime shadow-[0_0_10px_#C9F24D] transition-[top] duration-[120ms] ease-linear"
        style={{ top: TRACK_TOP }}
      />

      <div className="pointer-events-auto absolute inset-x-0 bottom-[34px] flex flex-col items-center gap-5">
        {SOCIALS.filter((s) => s.href).map((s) => (
          <a key={s.label} className="spine-social" href={s.href!} aria-label={s.label}>
            <SocialIcon name={s.label} />
          </a>
        ))}
      </div>
    </div>
  );
}
