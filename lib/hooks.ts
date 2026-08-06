"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
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

type SaveDataConnection = {
  saveData?: boolean;
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
};

const getConnection = (): SaveDataConnection | undefined =>
  (navigator as Navigator & { connection?: SaveDataConnection }).connection;

/**
 * Whether the client asked for reduced data use (`navigator.connection.saveData`).
 *
 * Same primitive as useMediaQuery, for the same reason: this is an external
 * store, and reading it through `useSyncExternalStore` keeps it out of an
 * effect — a `setState` in an effect body is the cascade React's lint rules
 * flag. `false` during SSR and hydration so the markup matches; the real value
 * lands immediately after, exactly as the media queries do.
 *
 * The Network Information API is Chromium-only and every member is optional
 * here, so an absent `connection` (Safari, Firefox) simply reads as "no
 * preference" rather than throwing.
 */
export function useSaveData(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const conn = getConnection();
      conn?.addEventListener?.("change", onStoreChange);
      return () => conn?.removeEventListener?.("change", onStoreChange);
    },
    () => getConnection()?.saveData === true,
    getServerSnapshot,
  );
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

/** Everything a form needs to gate submission on a Cloudflare Turnstile token. */
export type TurnstileGate = {
  /** Whether Turnstile is configured (a site key was supplied) for this form. */
  readonly enabled: boolean;
  /** The current token, or null while pending / after a reset. */
  readonly token: string | null;
  /** The widget failed to load (script blocked / render error). */
  readonly widgetFailed: boolean;
  /** A submit was attempted before a token existed — show a nudge. */
  readonly needsVerify: boolean;
  /** Bumped to force the widget to issue a fresh (single-use) token. */
  readonly resetSignal: number;
  readonly handleToken: (value: string | null) => void;
  readonly onWidgetError: () => void;
  /** Wraps a submit handler so it can't run without a token. */
  readonly guard: (
    submit: (event: FormEvent<HTMLFormElement>) => void,
  ) => (event: FormEvent<HTMLFormElement>) => void;
};

/**
 * Client-side Turnstile gating, shared by every form behind the widget. Keeps
 * the single-use / reset-on-failure / block-without-token logic in one place so
 * the forms stay consistent — the server verification is the real authority.
 *
 * @param turnstileSiteKey the public site key (empty ⇒ not configured ⇒ no gate)
 * @param error            the form's current submit error (drives the reset)
 */
export function useTurnstileGate(
  turnstileSiteKey: string,
  error: string | null,
): TurnstileGate {
  const enabled = turnstileSiteKey.length > 0;
  const [token, setToken] = useState<string | null>(null);
  const [widgetFailed, setWidgetFailed] = useState(false);
  const [needsVerify, setNeedsVerify] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

  // A failed submit consumes the single-use token — clear it and ask for a fresh
  // challenge so a retry isn't rejected as a duplicate.
  //
  // Adjusted during render against the previous `error` rather than in an
  // effect. React re-runs the component immediately with the new state and
  // never commits the intermediate render, so the widget is reset before the
  // user can see a stale token; the effect version painted once with the dead
  // token still in hand. It also drops `enabled` from the trigger — that is
  // derived from a site key which cannot change at runtime, so the only real
  // trigger was ever `error`.
  const [seenError, setSeenError] = useState(error);
  if (error !== seenError) {
    setSeenError(error);
    if (error && enabled) {
      setToken(null);
      setResetSignal((n) => n + 1);
    }
  }

  // A token arriving clears stale "couldn't load" / "please verify" state — the
  // error-callback can fire transiently and then recover on retry.
  const handleToken = (value: string | null) => {
    setToken(value);
    if (value) {
      setWidgetFailed(false);
      setNeedsVerify(false);
    }
  };

  // Block submit without a token even via Enter; the server rejects it anyway,
  // but this gives feedback instead of a silently dead button.
  const guard =
    (submit: (event: FormEvent<HTMLFormElement>) => void) =>
    (event: FormEvent<HTMLFormElement>) => {
      if (enabled && !token) {
        event.preventDefault();
        setNeedsVerify(true);
        return;
      }
      submit(event);
    };

  return {
    enabled,
    token,
    widgetFailed,
    needsVerify,
    resetSignal,
    handleToken,
    onWidgetError: () => setWidgetFailed(true),
    guard,
  };
}
