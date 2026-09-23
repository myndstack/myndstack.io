import { describe, expect, it } from "vitest";

import { scrambleFrame } from "@/lib/motion/scramble";

describe("scrambleFrame", () => {
  const text = "end to end.";

  it("is the real text at progress 1", () => {
    expect(scrambleFrame(text, 1, 3)).toBe(text);
  });

  it("keeps length and spaces at every progress", () => {
    for (const p of [0, 0.2, 0.5, 0.8]) {
      const frame = scrambleFrame(text, p, 3);
      expect(frame).toHaveLength(text.length);
      expect(frame[3]).toBe(" ");
      expect(frame[6]).toBe(" ");
    }
  });

  it("resolves left to right", () => {
    const frame = scrambleFrame(text, 0.5, 3);
    expect(frame.slice(0, 4)).toBe(text.slice(0, 4));
  });

  it("is deterministic (seekable from a paused timeline)", () => {
    expect(scrambleFrame(text, 0.3, 9)).toBe(scrambleFrame(text, 0.3, 9));
  });
});
