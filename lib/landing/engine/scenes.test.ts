import { describe, expect, it } from "vitest";

import { BEATS } from "./beats";
import { resolve, READING } from "./choreography";
import { grid } from "./layout";
import {
  FRONTS,
  PAGE,
  PANEL,
  SLIDE,
  placeFronts,
  planScenes,
  sceneWindows,
  skinAtRow,
  stageAt,
  textWindows,
  wordsAt,
} from "./scenes";
import { layoutPage } from "./scenes.fixture";

const VH = 900;
const px = (svh: number) => (svh * VH) / 100;

describe("planScenes", () => {
  const plans = planScenes(BEATS);

  it("gives every scene in PAGE a plan, in order", () => {
    expect(plans.map((p) => p.id)).toEqual(PAGE.filter((i) => i.kind === "scene").map((i) => i.id));
  });

  it("puts every beat's marker inside its own scene, where its hold's centre meets the reading line", () => {
    for (const beat of BEATS) {
      const plan = plans.find((p) => p.id === beat.scene)!;
      const hold = plan.holds.find((h) => h.id === beat.id)!;
      const marker = plan.markers.find((m) => m.id === beat.id)!;
      expect(marker.at, beat.id).toBeCloseTo((hold.start + hold.end) / 2 + READING * 100, 9);
      expect(marker.at, beat.id).toBeLessThan(plan.length);
      expect(hold.end - hold.start, beat.id).toBeCloseTo(beat.hold, 9);
    }
  });

  it("starts the page on the hero's hold and overlaps every later spacer 100svh onto the one above", () => {
    expect(plans[0].holds[0].start).toBe(0);
    expect(plans[0].overlap).toBe(false);
    for (const p of plans.slice(1)) expect(p.overlap, p.id).toBe(true);
  });

  it("splits a travel between two scenes at its middle (the panels swap while no words are shown)", () => {
    const intro = plans.find((p) => p.id === "intro")!;
    const stack = plans.find((p) => p.id === "stack")!;
    const travel = BEATS.find((b) => b.id === "stack")!.travel;
    const lastHold = intro.holds[intro.holds.length - 1];
    expect(intro.length - PANEL - lastHold.end).toBeCloseTo(travel / 2, 9);
    expect(stack.holds[0].start).toBeCloseTo(travel / 2, 9);
  });

  it("keeps a scene pinned for a full screen after its last hold when a sheet slides over it", () => {
    const studio = plans.find((p) => p.id === "studio")!;
    expect(studio.length - PANEL - studio.holds[studio.holds.length - 1].end).toBe(SLIDE);
  });

  it("lands anchor jumps on a scene's first hold", () => {
    for (const p of plans) expect(p.land, p.id).toBe(p.holds.find((h) => h.end > h.start)?.start ?? p.holds[0].start);
  });

  // Sixteen-odd screens of scenes, plus the screens where a sheet slides over or uncovers one.
  it("is about twenty screens of pinned scroll, slides included", () => {
    const pinned = plans.reduce((n, p) => n + p.length - (p.overlap ? PANEL : 0), 0) / 100;
    expect(pinned).toBeGreaterThan(15);
    expect(pinned).toBeLessThan(22);
  });
});

describe("fronts", () => {
  const { markers, end } = layoutPage(VH);
  const res = resolve(BEATS, markers, VH, end, grid(1440, VH));
  const fronts = placeFronts(res);
  const initial = res.beats[0].skin;

  it("are placed in page order", () => {
    expect(fronts.length).toBe(FRONTS.length);
    for (let i = 1; i < fronts.length; i++) expect(fronts[i].y).toBeGreaterThan(fronts[i - 1].y);
  });

  it("are the only way the stage's skin changes: every hold shows its beat's skin", () => {
    let passed = -1;
    for (let i = 0; i < res.beats.length; i++) {
      if (res.ends[i] <= res.starts[i]) continue;
      const y = (res.starts[i] + res.ends[i]) / 2;
      const state = stageAt(fronts, initial, y, VH, passed);
      passed = state.passed;
      // A scan may still be crossing a long hold (the dive): its lower half is the beat's skin.
      const shown = state.line !== null && state.line < VH / 2 ? state.next : state.skin;
      expect(shown, res.beats[i].id).toBe(res.beats[i].skin);
    }
  });

  it("chain: each front starts from the skin the one before it left", () => {
    let skin = initial;
    for (const f of fronts) {
      expect(f.from).toBe(skin);
      expect(f.to).not.toBe(f.from);
      skin = f.to;
    }
  });

  it("split the stage at a scan's line while it crosses the screen", () => {
    const scan = fronts.find((f) => f.kind === "scan")!;
    const before = stageAt(fronts, initial, scan.y - px(60), VH, -1);
    expect(before.skin).toBe(scan.from);
    expect(before.line).toBeNull();
    const mid = stageAt(fronts, initial, scan.y, VH, -1);
    expect(mid.skin).toBe(scan.from);
    expect(mid.next).toBe(scan.to);
    expect(mid.line).toBeCloseTo(VH / 2, 6);
    const later = stageAt(fronts, initial, scan.y + px(20), VH, -1);
    expect(later.line).toBeCloseTo(VH / 2 - px(20), 6);
    const after = stageAt(fronts, initial, scan.y + px(51), VH, -1);
    expect(after.skin).toBe(scan.to);
    expect(after.line).toBeNull();
  });

  it("fire a develop at its point, and hold it through a small wobble back (hysteresis)", () => {
    const i = fronts.findIndex((f) => f.kind === "develop");
    const f = fronts[i];
    const on = stageAt(fronts, initial, f.y + 1, VH, i - 1);
    expect(on.skin).toBe(f.to);
    expect(on.passed).toBe(i);
    expect(stageAt(fronts, initial, f.y - px(2), VH, i).skin).toBe(f.to);
    expect(stageAt(fronts, initial, f.y - px(6), VH, i).skin).toBe(f.from);
    expect(stageAt(fronts, initial, f.y - px(2), VH, i - 1).skin).toBe(f.from);
  });
});

describe("text windows", () => {
  const { markers, end } = layoutPage(VH);
  const res = resolve(BEATS, markers, VH, end, grid(1440, VH));
  const win = textWindows(res, VH);
  const at = (id: string) => res.beats.findIndex((b) => b.id === id);

  it("show a beat's words throughout its hold (from its entry, for the few that wait into it)", () => {
    for (let i = 0; i < res.beats.length; i++) {
      if (res.ends[i] <= res.starts[i]) continue;
      const from = Math.max(res.starts[i], win.enter[i]);
      expect(from, res.beats[i].id).toBeLessThan((res.starts[i] + res.ends[i]) / 2);
      for (const f of [0, 0.5, 1]) expect(wordsAt(win, from + f * (res.ends[i] - from), -1), res.beats[i].id).toBe(i);
    }
  });

  it("exit, then travel, then enter: nothing between, and the next words from 70% of the travel", () => {
    const i = at("cap-1");
    const j = i + 1;
    const y = (t: number) => res.ends[i] + t * (res.starts[j] - res.ends[i]);
    expect(wordsAt(win, y(0.05), -1)).toBe(i);
    expect(wordsAt(win, y(0.4), -1)).toBe(-1);
    expect(wordsAt(win, y(0.69), -1)).toBe(-1);
    expect(wordsAt(win, y(0.71), -1)).toBe(j);
  });

  it("never let a waypoint show words", () => {
    const via = at("closing-start");
    for (let y = res.starts[via] - px(30); y < res.starts[via] + px(30); y += 9) expect(wordsAt(win, y, -1)).not.toBe(via);
  });

  it("keep words in through a small wobble back (hysteresis), but not a real scroll back", () => {
    const j = at("cap-2");
    const enter = win.enter[j];
    expect(wordsAt(win, enter - 1, -1)).toBe(-1);
    expect(wordsAt(win, enter - px(1.5), j)).toBe(j);
    expect(wordsAt(win, enter - px(4), j)).toBe(-1);
  });

  it("keep a scene's last words on screen while a sheet slides over them", () => {
    const i = at("studio-contrast");
    expect(wordsAt(win, res.ends[i] + px(SLIDE - 2), -1)).toBe(i);
  });

  it("show each scene's own furniture (the parts list, the step list) for the whole scene", () => {
    const scenes = sceneWindows(res, win);
    const stack = scenes.get("stack")!;
    expect(stack[0]).toBe(win.enter[at("stack")]);
    expect(stack[1]).toBe(win.exit[at("locked")]);
  });
});

describe("skinAtRow", () => {
  it("reads the sheet covering a row first, then the stage either side of a scan", () => {
    const sheets = [{ top: 10_000, bottom: 12_000, skin: "drafting" as const }];
    const split = { passed: 0, skin: "machined" as const, next: "drafting" as const, line: 300 };
    expect(skinAtRow(split, sheets, 0, 80)).toBe("machined");
    expect(skinAtRow(split, sheets, 0, 450)).toBe("drafting");
    const plain = { passed: 0, skin: "machined" as const, next: null, line: null };
    expect(skinAtRow(plain, sheets, 9_950, 80)).toBe("drafting");
    expect(skinAtRow(plain, sheets, 9_950, 20)).toBe("machined");
  });
});
