/**
 * When the landing's scrubbed runs are pinned. The `pin:` custom variant in
 * app/globals.css uses this exact query (pin.test.ts keeps them identical), so
 * CSS decides the layout before first paint and JS only ever builds the scrub
 * for a layout that is actually pinned.
 *
 * Width alone isn't enough: a 1280×560 landscape laptop window can't fit a
 * pinned Core and its copy, so short screens get the static layout too. And
 * below 1000px wide (tablets in portrait) the pinned chapters' two columns
 * would stack and overflow the pinned frame — those get the static layout.
 */
export const PIN_QUERY =
  "(min-width: 62.5rem) and (min-height: 37.5rem) and (prefers-reduced-motion: no-preference)";
