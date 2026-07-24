import { describe, expect, it } from "vitest";
import { activeSection, type SectionOffset } from "./scroll-spy";

const LINE = 140;

/** Page order, which is not the nav's order — see the document-order tests. */
const PAGE: SectionOffset[] = [
  { id: "work-grid", top: 1200 },
  { id: "process", top: 3400 },
  { id: "pricing", top: 5600 },
  { id: "team", top: 7200 },
];

const at = (y: number, offsets: readonly SectionOffset[] = PAGE) =>
  activeSection(offsets, y, LINE);

describe("activeSection", () => {
  it("returns the first section in the document above everything", () => {
    expect(at(0)).toBe("work-grid");
  });

  it("activates a section as its top crosses the line", () => {
    // One pixel short of the line the previous section is still current.
    expect(at(1200 - LINE - 1)).toBe("work-grid");
    expect(at(1200 - LINE)).toBe("work-grid");
    expect(at(3400 - LINE - 1)).toBe("work-grid");
    expect(at(3400 - LINE)).toBe("process");
  });

  it("keeps the deepest crossed section, not the first", () => {
    expect(at(9000)).toBe("team");
  });

  it("is stable across the whole page", () => {
    const seen = new Set<string | null>();
    for (let y = 0; y <= 9000; y += 25) seen.add(at(y));
    expect([...seen]).toEqual(["work-grid", "process", "pricing", "team"]);
  });

  describe("document order, not argument order", () => {
    // The nav lists Work before Services while the page renders Services
    // first. Iterating the nav's order and keeping the last match highlighted
    // "Services" while you were reading Selected Work — a shipped regression.
    const NAV_ORDER: SectionOffset[] = [
      { id: "pricing", top: 5600 },
      { id: "work-grid", top: 1200 },
      { id: "team", top: 7200 },
      { id: "process", top: 3400 },
    ];

    it("picks the same section whatever order the offsets arrive in", () => {
      for (let y = 0; y <= 9000; y += 100) {
        expect(at(y, NAV_ORDER)).toBe(at(y, PAGE));
      }
    });

    it("falls back to the topmost section, not the first argument", () => {
      expect(at(0, NAV_ORDER)).toBe("work-grid");
    });
  });

  describe("degenerate input", () => {
    it("highlights nothing when there are no targets", () => {
      // Every sub-page: the nav renders, but none of its spy targets exist.
      expect(at(0, [])).toBe(null);
      expect(at(4000, [])).toBe(null);
    });

    it("handles a single section", () => {
      const one = [{ id: "work-grid", top: 1200 }];
      expect(at(0, one)).toBe("work-grid");
      expect(at(4000, one)).toBe("work-grid");
    });

    it("does not care about negative scroll from overscroll", () => {
      expect(at(-200)).toBe("work-grid");
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
