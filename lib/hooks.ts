"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { subscribeToScroll, type ScrollSubscriber } from "./scroll";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * The SSR and hydration value. Returning `false` keeps the server markup and the
 * first client render identical — the real value arrives immediately after,
 * without a hydration mismatch.
 */
const getServerSnapshot = () => false;

/**
 * Matches a media query.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect`: a media query is
 * an external store, and this is the primitive built for reading one. It also
 * avoids the set-state-inside-an-effect cascade (render → effect → set → render)
 * that the previous version caused, which React's lint rules now flag as an
 * error.
 */
export function useMediaQuery(query: string): boolean {
  const [subscribe, getSnapshot] = useMemo(
    () =>
      [
        (onStoreChange: () => void) => {
          const mq = window.matchMedia(query);
          mq.addEventListener("change", onStoreChange);
          return () => mq.removeEventListener("change", onStoreChange);
        },
        () => window.matchMedia(query).matches,
      ] as const,
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Tracks `prefers-reduced-motion`. `false` during SSR and hydration so markup
 * matches; the real value lands immediately after.
 */
export function useReducedMotion(): boolean {
  return useMediaQuery(REDUCED_MOTION_QUERY);
}

/**
 * Subscribes to the shared scroll loop. The callback runs inside the rAF frame
 * and should mutate styles directly rather than call setState — these fire on
 * every frame of every scroll.
 *
 * A bare function is a write-only subscriber, which is what almost everything
 * wants. Pass `{ read, write }` only if you genuinely have to measure the DOM:
 * every read runs before every write, so measuring never forces a synchronous
 * layout on top of another subscriber's mutation.
 */
export function useScrollFrame(subscriber: ScrollSubscriber) {
  const ref = useRef(subscriber);

  // Kept fresh in an effect, not during render. Writing to a ref while
  // rendering is unsafe under concurrent rendering (a render can be thrown away
  // or replayed), and React's lint rules now reject it. The subscription below
  // only ever reads `ref.current` inside a rAF frame — long after this has run —
  // so it always sees the latest subscriber.
  useEffect(() => {
    ref.current = subscriber;
  });

  useEffect(
    () =>
      subscribeToScroll({
        read: (state) => {
          const current = ref.current;
          if (typeof current !== "function") current.read?.(state);
        },
        write: (state) => {
          const current = ref.current;
          if (typeof current === "function") current(state);
          else current.write?.(state);
        },
      }),
    [],
  );
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
