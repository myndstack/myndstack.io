import { describe, expect, it } from "vitest";
import { activeSection, type SectionOffset } from "./scroll-spy";

const LINE = 96;

/** Page order, which is not the nav's order — see the document-order tests. */
const PAGE: SectionOffset[] = [
  { id: "platform", top: 1200 },
  { id: "work-grid", top: 3400 },
  { id: "work-cases", top: 5600 },
  { id: "pricing", top: 7200 },
];

const at = (y: number, offsets: readonly SectionOffset[] = PAGE) =>
  activeSection(offsets, y, LINE);

describe("activeSection", () => {
  it("highlights nothing until the first section's top crosses the line", () => {
    // Above every landmark (the hero / intro) nothing is current — no
    // first-in-document fallback, which used to light a section over the hero.
    expect(at(0)).toBe(null);
    expect(at(1200 - LINE - 1)).toBe(null);
  });

  it("activates a section as its top crosses the line", () => {
    // One pixel short of the line, nothing is current yet.
    expect(at(1200 - LINE - 1)).toBe(null);
    expect(at(1200 - LINE)).toBe("platform");
    expect(at(3400 - LINE - 1)).toBe("platform");
    expect(at(3400 - LINE)).toBe("work-grid");
  });

  it("keeps the deepest crossed section, not the first", () => {
    expect(at(9000)).toBe("pricing");
  });

  it("is stable across the whole page", () => {
    const seen = new Set<string | null>();
    for (let y = 0; y <= 9000; y += 25) seen.add(at(y));
    // `null` over the intro, then each landmark in document order.
    expect([...seen]).toEqual([null, "platform", "work-grid", "work-cases", "pricing"]);
  });

  describe("document order, not argument order", () => {
    // The nav lists sections in a different order than the page renders them.
    // Iterating the nav's order and keeping the last match highlighted the wrong
    // section while you were reading another — a shipped regression.
    const NAV_ORDER: SectionOffset[] = [
      { id: "work-cases", top: 5600 },
      { id: "platform", top: 1200 },
      { id: "pricing", top: 7200 },
      { id: "work-grid", top: 3400 },
    ];

    it("picks the same section whatever order the offsets arrive in", () => {
      for (let y = 0; y <= 9000; y += 100) {
        expect(at(y, NAV_ORDER)).toBe(at(y, PAGE));
      }
    });

    it("is null above every section, regardless of argument order", () => {
      expect(at(0, NAV_ORDER)).toBe(null);
    });
  });

  describe("degenerate input", () => {
    it("highlights nothing when there are no targets", () => {
      // Every sub-page: the nav renders, but none of its spy targets exist.
      expect(at(0, [])).toBe(null);
      expect(at(4000, [])).toBe(null);
    });

    it("handles a single section", () => {
      const one = [{ id: "platform", top: 1200 }];
      expect(at(0, one)).toBe(null);
      expect(at(4000, one)).toBe("platform");
    });

    it("does not care about negative scroll from overscroll", () => {
      expect(at(-200)).toBe(null);
    });

    it("breaks ties toward a single stable answer", () => {
      const tied = [
        { id: "a", top: 1000 },
        { id: "b", top: 1000 },
      ];
      // Which one wins matters less than that it never flickers between them.
      expect(at(2000, tied)).toBe("a");
      expect(at(2001, tied)).toBe("a");
    });
  });
});
