"use client";

import { useRef } from "react";
import { useScrollFrame } from "@/lib/hooks";

const SHOW_AFTER_PX = 600;
/** Circumference of the r=22 ring. */
const RING = 138.2;

/** Circular button with a lime progress ring showing how far down the page you are. */
export default function BackToTop() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);

  useScrollFrame(({ y, progress }) => {
    const button = buttonRef.current;
    if (button) {
      const visible = y > SHOW_AFTER_PX;
      button.classList.toggle("is-visible", visible);
      // `opacity: 0` alone still leaves the button in the tab order.
      button.inert = !visible;
    }
    if (ringRef.current) {
      ringRef.current.style.strokeDashoffset = (RING * (1 - progress)).toFixed(1);
    }
  });

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="totop group fixed right-[26px] bottom-[26px] z-59 size-[54px] cursor-pointer border-none bg-none p-0"
    >
      <svg
        width="54"
        height="54"
        viewBox="0 0 54 54"
        className="absolute inset-0 -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="27"
          cy="27"
          r="22"
          fill="#0A0A0B"
          stroke="var(--color-lime-edge)"
          strokeWidth="2"
          className="ease-brand transition-[stroke] duration-160 group-hover:stroke-lime"
        />
        <circle
          ref={ringRef}
          cx="27"
          cy="27"
          r="22"
          fill="none"
          stroke="#C9F24D"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={RING}
          strokeDashoffset={RING}
          className="transition-[stroke-dashoffset] duration-100 ease-linear [filter:drop-shadow(0_0_4px_rgba(201,242,77,.6))]"
        />
      </svg>
      <span className="ease-brand absolute inset-0 flex items-center justify-center font-mono text-[17px] leading-none text-white transition-colors duration-160 group-hover:text-lime">
        ↑
      </span>
    </button>
  );
}
