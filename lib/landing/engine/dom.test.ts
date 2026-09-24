import { describe, expect, it } from "vitest";

import { CAPABILITY_HUES } from "@/lib/landing/chapters";

import { BEATS } from "./beats";
import { beatDom } from "./dom";
import { STUDIO_AGENCY } from "./posters";

const at = (id: string) => BEATS.findIndex((b) => b.id === id);
const dom = (id: string, studio: "ours" | "agency" = "ours") => beatDom(BEATS, at(id), studio);

describe("beatDom", () => {
  it("names the beat and the poster the stage shows", () => {
    expect(dom("hero")).toMatchObject({ beat: "hero", poster: "face-ring" });
    expect(dom("cap-2")).toMatchObject({ poster: "face-top" });
    expect(dom("st-compute")).toMatchObject({ poster: "st-compute" });
    expect(dom("pricing").poster).toBeNull();
  });

  it("walks the capabilities in their hues, and completes the spectrum at the finale", () => {
    CAPABILITY_HUES.forEach((hue, i) => {
      expect(dom(`cap-${i}`)).toMatchObject({ cap: i, hue, complete: false });
    });
    expect(dom("finale")).toMatchObject({ cap: CAPABILITY_HUES.length, hue: "spectrum", complete: true });
    expect(dom("locked")).toMatchObject({ cap: null, hue: null, complete: false });
    expect(dom("work")).toMatchObject({ cap: null, hue: null });
  });

  it("lights the process steps in order, and keeps them lit after", () => {
    expect(dom("work").step).toBeNull();
    expect([1, 2, 3, 4].map((n) => dom(`build-${n}`).step)).toEqual([1, 2, 3, 4]);
    expect(dom("tools").step).toBe(4);
    expect(dom("studio").step).toBe(4);
  });

  it("carries each beat's labels", () => {
    expect(dom("stack").labels).toBe("stack");
    expect(dom("st-models").labels).toBe("annot");
    expect(dom("tools").labels).toBe("ports");
    expect(dom("hero").labels).toBeNull();
  });

  it("shows the studio as an agency would build it when the switch says so", () => {
    expect(dom("studio", "agency").poster).toBe(STUDIO_AGENCY);
    expect(dom("studio", "ours").poster).toBe("studio");
    expect(dom("tools", "agency").poster).toBe("tools");
  });

  it("is empty outside the table", () => {
    expect(beatDom(BEATS, -1, "ours").beat).toBeNull();
  });
});
