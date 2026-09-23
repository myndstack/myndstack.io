/**
 * The half of the intro-overlay contract that both sides need.
 *
 * Kept out of `components/Loader.tsx` on purpose. That file is `"use client"`,
 * and a value imported from a client module into a server component arrives as
 * a client-reference proxy rather than the value — interpolating it into the
 * inline script below produced a script that threw on every page load, with
 * nothing for `tsc` or eslint to complain about. Same reasoning as
 * `lib/form-shared.ts`: anything the server needs before the client module
 * loads belongs in a module with no directive at all.
 */

/** sessionStorage key. Present means the entrance has already played. */
export const LOADER_SEEN_KEY = "ms:loader-seen";

/**
 * Runs synchronously at the top of <body>, ahead of the loader markup, so the
 * "have we already played this?" decision is made before the overlay paints —
 * reading sessionStorage from an effect would show it for a frame first.
 *
 * Pairs with `html[data-seen] .loader { display: none }` in globals.css.
 *
 * When the intro WILL play it stamps `html[data-intro]` instead, and page
 * entrances wait for it (`--entrance-offset` in globals.css). Keyed off "will
 * play", not "not seen": the redesigned landing at /preview has no intro, and
 * its entrances must not wait for one. The path literal mirrors
 * LANDING_PREVIEW_PATH (lib/landing/route.ts).
 */
export const LOADER_SEEN_SCRIPT = `try{var d=document.documentElement;if(sessionStorage.getItem('${LOADER_SEEN_KEY}'))d.dataset.seen='1';else if(location.pathname!=='/preview'&&!matchMedia('(prefers-reduced-motion: reduce)').matches)d.dataset.intro='1'}catch(e){}`;
