import { describe, expect, it } from "vitest";

import { INITIAL_QUALITY, nextQuality } from "@/lib/motion/quality";

const run = (frames: number, frameMs: number, start = INITIAL_QUALITY) => {
  let q = start;
  let t = 0;
  for (let i = 0; i < frames; i++) {
    t += frameMs;
    q = nextQuality(q, frameMs, t);
  }
  return q;
};

describe("adaptive quality", () => {
  it("stays at full quality on smooth frames", () => {
    expect(run(600, 16).level).toBe(0);
  });

  it("drops a level after ~2s of slow frames", () => {
    expect(run(60, 30).level).toBe(0);
    expect(run(80, 30).level).toBe(1);
  });

  it("keeps stepping down under sustained load, but never below 2", () => {
    expect(run(400, 40).level).toBe(2);
  });

  it("ignores a single long frame (hysteresis)", () => {
    let q = run(100, 16);
    q = nextQuality(q, 400, 2000);
    q = nextQuality(q, 16, 2016);
    expect(q.level).toBe(0);
  });
});
