"use client";

import { useEffect, useRef } from "react";
import { useScrollFrame } from "@/lib/hooks";
import type { Social } from "@/lib/content";
import SocialIcon from "./SocialIcon";

/** Where the hairline starts and how much room the socials need at the bottom. */
const TRACK_TOP = 170;
const TRACK_BOTTOM_GAP = 188;

/** Fixed left rail: page-scroll progress plus social links. Hidden under 1100px. */
export default function ProgressSpine({ socials }: { socials: Social[] }) {
  const fillRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  /** Track length in px. Only the viewport height can change it. */
  const spanRef = useRef(0);

  useEffect(() => {
    const measure = () => {
      spanRef.current = Math.max(
        0,
        window.innerHeight - TRACK_TOP - TRACK_BOTTOM_GAP,
      );
    };

    measure();
    window.addEventListener("resize", measure, { passive: true });
    return () => window.removeEventListener("resize", measure);
  }, []);

  /**
   * Both writes are transforms, not `height` and `top`. The old pair animated
   * layout properties on every frame of every scroll — 120ms transitions on
   * `height`/`top` mean a layout and a paint per frame; scale and translate
   * stay on the compositor.
   *
   * The centering translate is folded in here because an inline `transform`
   * replaces the utility classes wholesale.
   */
  useScrollFrame(({ progress }) => {
    if (fillRef.current) {
      fillRef.current.style.transform = `translateX(-50%) scaleY(${progress.toFixed(4)})`;
    }
    if (dotRef.current) {
      const offset = (progress * spanRef.current).toFixed(1);
      dotRef.current.style.transform = `translate(-50%, calc(${offset}px - 50%))`;
    }
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
      {/* Full-length, scaled down to `progress` from its top edge. */}
      <div
        ref={fillRef}
        className="absolute left-1/2 w-0.5 origin-top bg-lime shadow-[0_0_8px_#C9F24D] transition-transform duration-[120ms] ease-linear"
        style={{
          top: TRACK_TOP,
          bottom: TRACK_BOTTOM_GAP,
          transform: "translateX(-50%) scaleY(0)",
        }}
      />
      <div
        ref={dotRef}
        className="absolute left-1/2 size-2 bg-lime shadow-[0_0_10px_#C9F24D] transition-transform duration-[120ms] ease-linear"
        style={{
          top: TRACK_TOP,
          transform: "translate(-50%, -50%)",
        }}
      />

      <div className="pointer-events-auto absolute inset-x-0 bottom-[34px] flex flex-col items-center gap-5">
        {socials.filter((s) => s.href).map((s) => (
          <a
            key={s.label}
            className="spine-social"
            href={s.href!}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={s.label}
          >
            <SocialIcon name={s.label} />
          </a>
        ))}
      </div>
    </div>
  );
}
