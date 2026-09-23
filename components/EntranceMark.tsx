"use client";

import { useEffect } from "react";

/** Intro hold (500) + longest entrance step (240) + the 600ms rise, rounded up. */
const ENTRANCE_DONE_MS = 1500;

/**
 * After the first page's header entrance has played, stamp `html[data-entered]`
 * so later client navigations skip it (see `.entrance` in globals.css) — the
 * view transition already fades those pages in, and a second rise read as the
 * page arriving twice. Mounted once in the root layout, on every route; it used
 * to live inside Loader, which tied every sub-page's entrance to the intro.
 */
export default function EntranceMark() {
  useEffect(() => {
    const t = window.setTimeout(() => {
      document.documentElement.dataset.entered = "1";
    }, ENTRANCE_DONE_MS);
    return () => window.clearTimeout(t);
  }, []);
  return null;
}
