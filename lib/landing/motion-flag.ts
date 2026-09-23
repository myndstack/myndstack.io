/**
 * Blocking inline script for the landing page's blueprint "draft" state. It
 * runs before first paint and stamps `html[data-anim="on"]` when motion is
 * allowed; the draft CSS (dashed outlines, undrawn lines) only applies under
 * that flag. So with JS off, or reduced motion on, the page paints fully built
 * from the first frame — there is nothing to reveal and nothing to get stuck.
 *
 * No directive: app/layout.tsx (a server component) interpolates it, and a
 * value from a "use client" module would arrive as a reference proxy (see
 * lib/loader-seen.ts for the incident that taught this).
 */
export const MOTION_FLAG_SCRIPT = `try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.dataset.anim='on'}catch(e){}`;
