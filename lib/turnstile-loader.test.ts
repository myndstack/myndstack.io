import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadTurnstile, resetTurnstileLoader, type TurnstileApi } from "@/lib/turnstile-loader";

// Node test env: stand in just enough window/document for the loader.
type FakeScript = {
  id: string;
  src: string;
  async: boolean;
  defer: boolean;
  listeners: Record<string, () => void>;
  addEventListener: (type: string, fn: () => void) => void;
  remove: () => void;
};

const api: TurnstileApi = { render: () => "w", reset: () => {}, remove: () => {} };

let scripts: FakeScript[];
let win: { turnstile?: TurnstileApi; onTurnstileLoad?: () => void };

beforeEach(() => {
  scripts = [];
  win = {};
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", {
    getElementById: (id: string) => scripts.find((s) => s.id === id) ?? null,
    createElement: (): FakeScript => {
      const script: FakeScript = {
        id: "",
        src: "",
        async: false,
        defer: false,
        listeners: {},
        addEventListener: (type, fn) => {
          script.listeners[type] = fn;
        },
        remove: () => {
          scripts = scripts.filter((s) => s !== script);
        },
      };
      return script;
    },
    head: { appendChild: (s: FakeScript) => scripts.push(s) },
  });
  resetTurnstileLoader();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const scriptLoads = () => {
  win.turnstile = api;
  win.onTurnstileLoad?.();
};

describe("loadTurnstile", () => {
  it("resolves EVERY caller that asked before the script loaded", async () => {
    // Regression: each widget used to overwrite the single global onload
    // callback, so only the last widget on the page ever rendered.
    const first = loadTurnstile();
    const second = loadTurnstile();
    expect(scripts).toHaveLength(1);

    scriptLoads();

    await expect(first).resolves.toBe(api);
    await expect(second).resolves.toBe(api);
  });

  it("resolves immediately when the API is already present", async () => {
    win.turnstile = api;
    await expect(loadTurnstile()).resolves.toBe(api);
    expect(scripts).toHaveLength(0);
  });

  it("rejects on script error and lets a later call retry with a fresh script", async () => {
    const first = loadTurnstile();
    scripts[0].listeners.error();
    await expect(first).rejects.toThrow();
    expect(scripts).toHaveLength(0);

    const retry = loadTurnstile();
    expect(scripts).toHaveLength(1);
    scriptLoads();
    await expect(retry).resolves.toBe(api);
  });

  it("rejects when the script never loads", async () => {
    vi.useFakeTimers();
    const pending = loadTurnstile(1_000);
    vi.advanceTimersByTime(1_000);
    await expect(pending).rejects.toThrow();
  });
});
