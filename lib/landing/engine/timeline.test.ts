import { describe, expect, it } from "vitest";

import { BEATS } from "./beats";
import { resolve } from "./choreography";
import { grid } from "./layout";
import { posterFor } from "./poster-ids";
import { layoutPage } from "./scenes.fixture";
import { beatAt, place } from "./timeline";

const VH = 900;
const G = grid(1440, VH);

describe("the first-load timeline", () => {
  it("places the beats exactly as the full resolver does — holds, waypoints and baked poses", () => {
    const { markers, end } = layoutPage(VH);
    const full = resolve(BEATS, markers, VH, end, G);
    const light = place(BEATS, markers, VH, end, G);
    expect(light.beats.map((b) => b.id)).toEqual(full.beats.map((b) => b.id));
    expect(Array.from(light.starts)).toEqual(Array.from(full.starts));
    expect(Array.from(light.ends)).toEqual(Array.from(full.ends));
    expect(Array.from(light.via)).toEqual(Array.from(full.via));
    expect(Array.from(light.poses)).toEqual(Array.from(full.poses));
  });

  it("answers which beat holds the stage from the placement alone", () => {
    const { markers, end } = layoutPage(VH);
    const light = place(BEATS, markers, VH, end, G);
    light.beats.forEach((beat, i) => {
      if (light.via[i]) return;
      const mid = (light.starts[i] + light.ends[i]) / 2;
      expect(light.beats[beatAt(light, mid, null)].id, beat.id).toBe(beat.id);
    });
  });

  it("picks each beat's poster without the pose maths", () => {
    for (const beat of BEATS) {
      expect(posterFor(beat.id), beat.id).toEqual(beat.fit === "circle" ? { kind: "face" } : { kind: "draw", id: beat.id });
    }
  });
});
