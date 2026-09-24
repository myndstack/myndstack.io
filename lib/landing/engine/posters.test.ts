import { describe, expect, it } from "vitest";

import { BEATS } from "./beats";
import { DRAW_POSTERS, STUDIO_AGENCY, drawingOf, posterFor } from "./posters";

describe("the poster table", () => {
  it("gives every beat exactly one poster: the Core face for face poses, its own drawing otherwise", () => {
    for (const beat of BEATS) {
      const poster = posterFor(beat.id);
      if (beat.fit === "circle") expect(poster, beat.id).toEqual({ kind: "face" });
      else expect(poster, beat.id).toEqual({ kind: "draw", id: beat.id });
    }
    expect(posterFor("nope")).toBeNull();
  });

  it("draws each sphere-fit beat from its own pose, plus the studio's agency state", () => {
    const ids = DRAW_POSTERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    const drawn = BEATS.filter((b) => b.fit === "sphere").map((b) => b.id);
    expect(ids).toEqual([...drawn, STUDIO_AGENCY]);
  });

  it("keeps the focused module at full strength at each station", () => {
    const focus = Object.fromEntries(DRAW_POSTERS.map((p) => [p.id, p.focus]));
    expect([focus["st-interface"], focus["st-models"], focus["st-compute"], focus["st-data"]]).toEqual([1, 2, 3, 4]);
    expect(focus.stack).toBeUndefined();
    expect(focus.locked).toBeUndefined();
  });

  it("sketches process 01, dimensions 02, and powers the arcs only when the pose does", () => {
    const by = Object.fromEntries(DRAW_POSTERS.map((p) => [p.id, p]));
    expect(by["build-1"].sketch).toBe(true);
    expect(by["build-2"].view.dims).toBe(true);
    expect(by["build-3"].powered).toBe(false);
    expect(by["build-4"].powered).toBe(true);
    expect(by.tools.view.ports).toBe(true);
  });

  it("renders every drawing inside a finite viewBox", () => {
    for (const p of DRAW_POSTERS) {
      const d = drawingOf(p);
      expect(d.viewBox.every(Number.isFinite), p.id).toBe(true);
      expect(d.viewBox[2]).toBeGreaterThan(0);
      expect(d.viewBox[3]).toBeGreaterThan(0);
    }
  });

  it("breaks the studio apart for the agency state, and only there", () => {
    const agency = DRAW_POSTERS.find((p) => p.id === STUDIO_AGENCY);
    expect(agency?.view.shift?.some((s) => s !== 0)).toBe(true);
    for (const p of DRAW_POSTERS) if (p.id !== STUDIO_AGENCY) expect(p.view.shift).toBeUndefined();
  });
});
