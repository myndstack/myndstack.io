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
 * nav lists *Work* before *Services* while the page renders *Services* first,
 * so trusting the nav's order highlighted the wrong link — that shipped once.
 *
 * Above every section, falls back to whichever section is nearest the top of
 * the *document*, for the same reason. Returns null when there are no targets
 * at all, which is the case on every sub-page: nothing should be highlighted
 * there.
 */
export function activeSection(
  offsets: readonly SectionOffset[],
  y: number,
  line: number,
): string | null {
  const crossing = y + line;

  let active: string | null = null;
  let deepestCrossed = -Infinity;

  let firstInDocument: string | null = null;
  let highestTop = Infinity;

  for (const { id, top } of offsets) {
    if (top < highestTop) {
      highestTop = top;
      firstInDocument = id;
    }
    if (top <= crossing && top > deepestCrossed) {
      deepestCrossed = top;
      active = id;
    }
  }

  return active ?? firstInDocument;
}
