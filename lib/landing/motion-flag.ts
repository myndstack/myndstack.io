/**
 * Blocking inline script for the landing page's motion. It runs before first
 * paint and stamps `html[data-anim="on"]` when motion is allowed; the draft
 * CSS (undrawn arcs) and the pinned layout (the `pin:` variant) only apply
 * under that flag. So with JS off, or reduced motion on, the page paints fully
 * built and unpinned from the first frame — nothing to reveal, nothing stuck.
 *
 * `?motion=off` in the URL does the same: a QA / support switch for the
 * static layout on any device.
 *
 * No directive: app/layout.tsx (a server component) interpolates it, and a
 * value from a "use client" module would arrive as a reference proxy (see
 * lib/loader-seen.ts for the incident that taught this).
 */
export const MOTION_FLAG_SCRIPT = `try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&!/[?&]motion=off\\b/.test(location.search))document.documentElement.dataset.anim='on'}catch(e){}`;
