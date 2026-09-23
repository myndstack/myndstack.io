import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { PIN_QUERY } from "@/lib/motion/pin";

// JS decides whether to build the pinned scrub; CSS decides whether anything
// is actually pinned. If the two queries drift, a window size exists where JS
// scrubs a static layout (or CSS pins a page nothing animates).
const css = readFileSync(fileURLToPath(new URL("../../app/globals.css", import.meta.url)), "utf8");

describe("PIN_QUERY", () => {
  it("is exactly the media query of the `pin:` custom variant", () => {
    const block = /@custom-variant pin\s*\{\s*@media screen and ([^{]+)\{/.exec(css);
    expect(block, "@custom-variant pin not found in globals.css").not.toBeNull();
    expect(block![1].trim()).toBe(PIN_QUERY);
  });

  it("requires width, height and motion", () => {
    expect(PIN_QUERY).toContain("min-width");
    expect(PIN_QUERY).toContain("min-height");
    expect(PIN_QUERY).toContain("prefers-reduced-motion: no-preference");
  });
});
