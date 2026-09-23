"use client";

import { useRef } from "react";
import { useScrollFrame } from "@/lib/hooks";
import { INITIAL_SCROLL_INTENT, nextScrollIntent } from "@/lib/scroll-intent";

/**
 * Back-to-top button: a solid lime square that appears when you start heading
 * back up the page.
 *
 * No progress indicator — the fixed left spine already shows scroll position,
 * and a second readout competed with it. Square rather than circular because
 * this design has no rounded corners anywhere else.
 */
export default function BackToTop() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const intentRef = useRef(INITIAL_SCROLL_INTENT);
  /** What the DOM currently shows — writes happen only on a change (AGENTS.md). */
  const shownRef = useRef<boolean | null>(null);

  useScrollFrame(({ y }) => {
    const button = buttonRef.current;
    if (!button) return;

    const intent = nextScrollIntent(intentRef.current, y);
    intentRef.current = intent;

    if (shownRef.current === intent.visible) return;
    shownRef.current = intent.visible;
    button.classList.toggle("is-visible", intent.visible);
    // `opacity: 0` alone still leaves the button in the tab order.
    button.inert = !intent.visible;
  });

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label="Back to top"
      onClick={() =>
        // The CSS reduced-motion override doesn't reach JS scrolls; honour it here.
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        })
      }
      className="totop fixed right-[26px] bottom-[26px] z-59 flex size-11 cursor-pointer items-center justify-center border-none bg-lime text-lime-ink hover:bg-lime-hover"
    >
      <span aria-hidden="true" className="font-mono text-[15px] leading-none">
        ↑
      </span>
    </button>
  );
}
