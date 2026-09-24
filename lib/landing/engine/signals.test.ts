import { describe, expect, it, vi } from "vitest";

import { createSignals } from "./signals";

type Map = { mode: "ours" | "agency"; focus: number };

describe("createSignals", () => {
  it("starts from the initial values and reads them back", () => {
    const s = createSignals<Map>({ mode: "ours", focus: 0 });
    expect(s.get("mode")).toBe("ours");
    expect(s.get("focus")).toBe(0);
  });

  it("notifies subscribers once per actual change, with the key", () => {
    const s = createSignals<Map>({ mode: "ours", focus: 0 });
    const spy = vi.fn();
    s.subscribe(spy);
    s.set("focus", 2);
    s.set("focus", 2);
    s.set("mode", "agency");
    expect(spy.mock.calls).toEqual([["focus"], ["mode"]]);
    expect(s.version()).toBe(2);
  });

  it("stops notifying after unsubscribe", () => {
    const s = createSignals<Map>({ mode: "ours", focus: 0 });
    const spy = vi.fn();
    const off = s.subscribe(spy);
    off();
    s.set("focus", 1);
    expect(spy).not.toHaveBeenCalled();
  });

  it("snapshot is a frozen copy that later sets don't touch", () => {
    const s = createSignals<Map>({ mode: "ours", focus: 0 });
    const snap = s.snapshot();
    s.set("focus", 3);
    expect(snap.focus).toBe(0);
    expect(Object.isFrozen(snap)).toBe(true);
  });

  it("reset restores the initial values and notifies only what changed", () => {
    const s = createSignals<Map>({ mode: "ours", focus: 0 });
    s.set("focus", 3);
    const spy = vi.fn();
    s.subscribe(spy);
    s.reset();
    expect(s.get("focus")).toBe(0);
    expect(spy.mock.calls).toEqual([["focus"]]);
  });
});
