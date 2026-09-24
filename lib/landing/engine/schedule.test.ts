import { describe, expect, it } from "vitest";

import { frameDue, schedule, type ScheduleInput } from "./schedule";

const base: ScheduleInput = {
  visible: true,
  moving: false,
  ambient: false,
  sinceInputMs: 0,
  idleSleepMs: 12_000,
  ambientFps: 60,
};

describe("schedule", () => {
  it("runs at full rate while anything is moving", () => {
    expect(schedule({ ...base, moving: true })).toEqual({ run: true, fps: 60 });
    expect(schedule({ ...base, moving: true, ambientFps: 30 })).toEqual({ run: true, fps: 60 });
  });

  it("stops completely when nothing moves and the pose allows no idle motion", () => {
    expect(schedule(base)).toEqual({ run: false, fps: 0 });
  });

  it("idles at the tier's ambient rate, then sleeps after the idle window", () => {
    expect(schedule({ ...base, ambient: true, ambientFps: 30 })).toEqual({ run: true, fps: 30 });
    expect(schedule({ ...base, ambient: true, sinceInputMs: 11_999 })).toEqual({ run: true, fps: 60 });
    expect(schedule({ ...base, ambient: true, sinceInputMs: 12_000 })).toEqual({ run: false, fps: 0 });
  });

  it("never runs while hidden, even mid-motion", () => {
    expect(schedule({ ...base, visible: false, moving: true, ambient: true })).toEqual({ run: false, fps: 0 });
  });

  it("gives no idle motion to a tier without it", () => {
    expect(schedule({ ...base, ambient: true, ambientFps: 0 })).toEqual({ run: false, fps: 0 });
  });
});

describe("frameDue", () => {
  it("is always due at 60 fps", () => {
    expect(frameDue(1000, 1016.7, 60)).toBe(true);
    expect(frameDue(1000, 1001, 60)).toBe(true);
  });

  it("renders every other 60 Hz frame at 30 fps, without beating against the display", () => {
    const rendered: number[] = [];
    let last = -Infinity;
    for (let i = 0; i < 60; i++) {
      const now = i * (1000 / 60);
      if (frameDue(last, now, 30)) {
        rendered.push(i);
        last = now;
      }
    }
    expect(rendered.length).toBe(30);
    expect(rendered.slice(0, 4)).toEqual([0, 2, 4, 6]);
  });

  it("is never due at 0 fps", () => {
    expect(frameDue(0, 10_000, 0)).toBe(false);
  });
});
