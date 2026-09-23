"use client";

/**
 * Every mounted landing chapter registers a `finish` here. Two things call it:
 *
 * - `beforeprint`: paper must show the built page, not a half-drawn one.
 * - a `motion:finish-all` DOM event: the e2e suite's equivalent of revealing
 *   every `.reveal`, so axe and screenshots see the settled page.
 *
 * The document listeners are ref-counted — attached with the first chapter and
 * removed with the last — so HMR and StrictMode's double effects never stack
 * duplicates.
 */

export const FINISH_ALL_EVENT = "motion:finish-all";

const finishers = new Set<() => void>();

function finishAll(): void {
  finishers.forEach((finish) => finish());
}

export function registerChapter(finish: () => void): () => void {
  finishers.add(finish);
  if (finishers.size === 1) {
    document.addEventListener(FINISH_ALL_EVENT, finishAll);
    window.addEventListener("beforeprint", finishAll);
  }
  return () => {
    finishers.delete(finish);
    if (finishers.size === 0) {
      document.removeEventListener(FINISH_ALL_EVENT, finishAll);
      window.removeEventListener("beforeprint", finishAll);
    }
  };
}
