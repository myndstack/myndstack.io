/**
 * The ONLY place the site imports anime.js (plus its sibling files in this
 * folder), split per subpath so a chunk pulls in just what it uses — the hero
 * never ships the draggable, the stack never ships text splitting. ESLint
 * enforces this (no-restricted-imports in eslint.config.mjs).
 *
 * Deliberately absent: `animejs/events` (onScroll / ScrollObserver). It adds
 * its own scroll listener and reads layout every frame; AGENTS.md allows one
 * scroll listener for the whole site (lib/scroll.ts). Scrubbed chapters are
 * paused timelines seeked from that loop instead (MotionChapter).
 */
export { animate } from "animejs/animation";
export { createTimeline } from "animejs/timeline";
export type { Timeline } from "animejs/timeline";
export type { JSAnimation } from "animejs/animation";
export { createScope } from "animejs/scope";
export type { Scope } from "animejs/scope";
export { cubicBezier } from "animejs/easings/cubic-bezier";
export { stagger, utils } from "./utils";
