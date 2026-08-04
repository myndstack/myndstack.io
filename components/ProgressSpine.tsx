"use client";

import { useEffect, useRef } from "react";
import { useScrollFrame } from "@/lib/hooks";
import type { Social } from "@/lib/content";
import Magnetic from "./Magnetic";
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

  /**
   * Where the browser can drive the fill + dot off a CSS scroll-timeline
   * (see `.spine-fill` / `.spine-dot` in globals.css), the JS path below is
   * pure overhead — and a running CSS animation overrides inline transforms
   * anyway. Skip the per-frame writes there so modern browsers do zero
   * per-frame work. Computed on the client (this is a "use client" component).
   */
  const nativeTimeline =
    typeof CSS !== "undefined" && CSS.supports("animation-timeline: scroll(root)");

  useEffect(() => {
    if (nativeTimeline) return;
    const measure = () => {
      spanRef.current = Math.max(
        0,
        window.innerHeight - TRACK_TOP - TRACK_BOTTOM_GAP,
      );
    };

    measure();
    window.addEventListener("resize", measure, { passive: true });
    return () => window.removeEventListener("resize", measure);
  }, [nativeTimeline]);

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
    // Native scroll-timeline is driving the transforms — don't fight it.
    if (nativeTimeline) return;
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
      {/* The full-bleed horizontal rules (masthead divider, section seams, the
          footer + contact-block borders) don't hard-stop at the spine — they
          FADE OUT into it. A page-coloured gradient, opaque across the rail and
          feathering to transparent, hides each rule at the spine and eases it
          back in, so nothing crosses and nothing chops. Full height, to catch
          every rule at any scroll position; the soft edge also lets the hero
          network thin toward the gutter instead of getting a hard cut. Under the
          hairline / fill / dot / label (first child = painted first). */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-24"
        style={{
          background:
            "linear-gradient(to right, var(--color-ink) 0, var(--color-ink) 38px, transparent 92px)",
        }}
      />
      {/* The label and the whole progress track are decoration — a scroll-
          position indicator conveys nothing to a screen reader, and the "Follow"
          label is dim ornament beside the labelled social icons below. Hidden
          from the a11y tree so the contrast rules don't apply and the rail's only
          real content is the social nav. */}
      {/* aria-hidden because it's decoration beside the labelled social links —
          but aria-hidden does NOT exempt an element from a contrast audit (the
          text is still on screen), so the colour has to clear AA on its own: t5,
          not the old t7. */}
      <div
        aria-hidden="true"
        className="absolute top-[100px] left-1/2 -translate-x-1/2 font-mono text-[10px] font-bold tracking-[0.22em] text-t5 uppercase"
        style={{ writingMode: "vertical-rl" }}
      >
        Follow
      </div>

      <div
        aria-hidden="true"
        className="absolute left-1/2 w-px -translate-x-1/2 bg-line"
        style={{ top: TRACK_TOP, bottom: TRACK_BOTTOM_GAP }}
      />
      {/* Full-length, scaled down to `progress` from its top edge. */}
      <div
        ref={fillRef}
        aria-hidden="true"
        className="spine-fill absolute left-1/2 w-0.5 origin-top bg-lime shadow-[0_0_8px_#C9F24D] transition-transform duration-[120ms] ease-linear"
        style={{
          top: TRACK_TOP,
          bottom: TRACK_BOTTOM_GAP,
          transform: "translateX(-50%) scaleY(0)",
        }}
      />
      <div
        ref={dotRef}
        aria-hidden="true"
        className="spine-dot absolute left-1/2 size-2 bg-lime shadow-[0_0_10px_#C9F24D] transition-transform duration-[120ms] ease-linear"
        style={{
          top: TRACK_TOP,
          transform: "translate(-50%, -50%)",
        }}
      />

      <nav
        aria-label="Social"
        className="pointer-events-auto absolute inset-x-0 bottom-[34px] flex flex-col items-center gap-5"
      >
        {socials.filter((s) => s.href).map((s) => (
          <Magnetic key={s.label}>
            <a
              className="spine-social"
              href={s.href!}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
            >
              <SocialIcon name={s.label} />
            </a>
          </Magnetic>
        ))}
      </nav>
    </div>
  );
}
