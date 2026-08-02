/**
 * Which nav section is "current", as a pure function of cached geometry.
 *
 * Deliberately takes *absolute* document offsets rather than viewport rects.
 * The scroll frame used to call `getBoundingClientRect()` once per section,
 * interleaved with the nav's own class writes, which forced a synchronous
 * layout per section per frame. Offsets don't change when you scroll, so they
 * are measured once and refreshed only when layout actually moves — leaving
 * this as arithmetic.
 */

/** A spy target and its distance from the top of the document. */
export type SectionOffset = {
  id: string;
  /** `element.offsetTop` — absolute, so it survives scrolling. */
  top: number;
};

/**
 * The last section (in document order) whose top has crossed `line`, where
 * `line` is measured down from the top of the viewport.
 *
 * Order comes from comparing positions, never from the order of `offsets`. The
 * nav once listed sections in a different order than the page rendered them, so
 * trusting the nav's order highlighted the wrong link — that shipped once.
 *
 * Returns **null** until the first section's top has crossed the line, so
 * nothing is highlighted while the reader is above every landmark (the hero /
 * intro), on the closing sections past the tail sentinel, or on a sub-page with
 * no targets. A false "first section" highlight over the hero was the old bug.
 */
export function activeSection(
  offsets: readonly SectionOffset[],
  y: number,
  line: number,
): string | null {
  const crossing = y + line;

  let active: string | null = null;
  let deepestCrossed = -Infinity;

  for (const { id, top } of offsets) {
    if (top <= crossing && top > deepestCrossed) {
      deepestCrossed = top;
      active = id;
    }
  }

  return active;
}
