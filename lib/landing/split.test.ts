import { describe, expect, it } from "vitest";

import { splitWords } from "./split";

const join = (text: string) =>
  splitWords(text)
    .map((t) => t.text)
    .join("");

describe("splitWords", () => {
  it("round-trips exactly, whitespace and punctuation included", () => {
    for (const s of [
      "Architected and built, end to end.",
      "  leading and trailing  ",
      "Four layers.\nOne team.",
      "Start small. Scale when it’s working.",
      "",
    ]) {
      expect(join(s)).toBe(s);
    }
  });

  it("splits at breaking spaces only — a non-breaking space stays inside its word", () => {
    const tokens = splitWords("Web · mobile · agents");
    expect(tokens.filter((t) => !t.space).map((t) => t.text)).toEqual(["Web ·", "mobile ·", "agents"]);
  });

  it("marks whitespace runs as spaces and everything else as words", () => {
    expect(splitWords("a  b")).toEqual([
      { text: "a", space: false },
      { text: "  ", space: true },
      { text: "b", space: false },
    ]);
  });

  it("keeps hyphenated words whole", () => {
    expect(splitWords("Founder-led. Hands on").filter((t) => !t.space)[0].text).toBe("Founder-led.");
  });
});
