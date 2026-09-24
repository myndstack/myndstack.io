import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { CSS_TOKENS, SKIN, SKINS, SURFACES, TEXT_ROLES, contrast, rgba } from "./skins";

const css = readFileSync(fileURLToPath(new URL("../../../components/landing/styles/skins.css", import.meta.url)), "utf8");

/** The declarations inside the rule for `[data-skin="…"]`. */
function block(skin: string): string {
  const match = new RegExp(`\\[data-skin="${skin}"\\][^{]*\\{([^}]*)\\}`).exec(css);
  if (!match) throw new Error(`no [data-skin="${skin}"] rule in skins.css`);
  return match[1];
}

function cssToken(skin: string, name: string): string {
  const match = new RegExp(`--skin-${name}:\\s*([^;]+);`).exec(block(skin));
  if (!match) throw new Error(`--skin-${name} missing for ${skin}`);
  return match[1].trim().toLowerCase();
}

describe("skins", () => {
  it("are the three the design names, with the planned bases", () => {
    expect(SKINS).toEqual(["machined", "drafting", "signal"]);
    expect(SKIN.machined.base).toBe("#0a0a0b");
    expect(SKIN.drafting.base).toBe("#d9d7d1");
    expect(SKIN.signal.base).toBe("#060708");
  });

  it("mirror skins.css exactly (the renderer and the page can't drift)", () => {
    for (const skin of SKINS) {
      for (const name of CSS_TOKENS) {
        expect(cssToken(skin, name), `${skin} --skin-${name}`).toBe(SKIN[skin][name].toLowerCase());
      }
    }
  });

  it("keep every text role at 4.5:1 or better on every surface of its skin", () => {
    for (const skin of SKINS) {
      for (const surface of SURFACES) {
        for (const role of TEXT_ROLES) {
          const ratio = contrast(SKIN[skin][role], SKIN[skin][surface]);
          expect(ratio, `${skin} ${role} on ${surface}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it("keep paper cards lighter than the paper they sit on", () => {
    const lum = (hex: string) => contrast(hex, "#000000");
    expect(lum(SKIN.drafting.card)).toBeGreaterThan(lum(SKIN.drafting.base));
    expect(lum(SKIN.drafting.raised)).toBeGreaterThan(lum(SKIN.drafting.card));
  });
});

describe("contrast", () => {
  it("is WCAG's ratio (white on black is 21:1, a colour on itself 1:1)", () => {
    expect(contrast("#ffffff", "#000000")).toBeCloseTo(21, 6);
    expect(contrast("#c9f24d", "#c9f24d")).toBeCloseTo(1, 6);
  });
});

describe("rgba", () => {
  it("parses hex into 0–1 channels for the renderer", () => {
    expect(rgba("#ff8000")).toEqual([1, 128 / 255, 0, 1]);
    expect(rgba("#0a0a0b")[2]).toBeCloseTo(11 / 255, 9);
  });
});
