"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeToScroll, type ScrollState } from "./scroll";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Tracks `prefers-reduced-motion`. Returns `false` during SSR and the first
 * client render so markup matches; the real value lands in the first effect.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(REDUCED_MOTION_QUERY);
    setReduced(mq.matches);

    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/**
 * Matches a media query. Returns `false` during SSR and the first client render
 * so markup matches; the real value lands in the first effect.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);

    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/**
 * Subscribes to the shared scroll loop. The callback runs inside the rAF frame
 * and should mutate styles directly rather than call setState — these fire on
 * every frame of every scroll.
 */
export function useScrollFrame(callback: (state: ScrollState) => void) {
  const ref = useRef(callback);
  ref.current = callback;

  useEffect(() => subscribeToScroll((state) => ref.current(state)), []);
}

/** Set once if IntersectionObserver turns out not to deliver — see the watchdog. */
let observerBroken = false;
let watchdogStarted = false;

/**
 * Reveals are the only thing making most of the page visible, so if
 * IntersectionObserver never fires the site renders blank. That happens in more
 * places than you'd hope — background tabs being captured, hardened or
 * stripped-down browsers, extensions that stub the API.
 *
 * Probe it once on first use; if nothing is delivered, give up on scroll
 * reveals entirely and show everything rather than shipping an empty page.
 */
function startRevealWatchdog() {
  if (watchdogStarted || typeof IntersectionObserver === "undefined") return;
  watchdogStarted = true;

  let delivered = false;
  const probe = new IntersectionObserver(() => {
    delivered = true;
    probe.disconnect();
  });
  probe.observe(document.body);

  window.setTimeout(() => {
    if (delivered) return;
    probe.disconnect();
    observerBroken = true;
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-in"));
  }, 1500);
}

/**
 * Adds `.is-in` the first time the element enters the viewport, then stops
 * observing. Pairs with the `.reveal` class in globals.css.
 */
export function useReveal<T extends HTMLElement>(enabled = true) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!enabled || observerBroken || typeof IntersectionObserver === "undefined") {
      el.classList.add("is-in");
      return;
    }

    startRevealWatchdog();

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [enabled]);

  return ref;
}

/** Fires once when the element first crosses `threshold`. */
export function useInView<T extends HTMLElement>(threshold = 0.5) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return [ref, inView] as const;
}
