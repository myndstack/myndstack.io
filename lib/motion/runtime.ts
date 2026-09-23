/**
 * The anime.js pieces MotionChapter itself needs (a scope to build in, a timer
 * for the glide), loaded lazily alongside the first chapter's builder — so
 * the animation engine is never part of the page's first-load JavaScript.
 */
export { createScope } from "@/lib/motion/anime/core";
export { createTimer } from "@/lib/motion/anime/timer";
