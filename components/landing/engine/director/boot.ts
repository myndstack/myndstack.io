/**
 * The director, first-load half (no three.js): it measures the page outside
 * any frame, then each scroll frame is arithmetic on cached numbers — which
 * beat holds the stage, whose words are in, where the front is — and the DOM
 * is written only when a value changes: data attributes (CSS does the rest),
 * the stage's two skin sheets and their clip, the chrome's skins. Develops
 * run on their own short clock (560ms, at most one per 1.2s, reversible).
 *
 * The live half (live.ts: the spring, the camera, the renderer, the
 * overlays) loads lazily when the device qualifies and reads this module's
 * state every frame; without it the stage shows posters. Pinned layout only.
 */
import { CORE } from "@/lib/motion/core-geometry";
import { PIN_QUERY } from "@/lib/motion/pin";
import { beatDom } from "@/lib/landing/engine/dom";
import { boxOf } from "@/lib/landing/engine/layout";
import { skinAtRow, stageAt, wordsAt, type Front, type StageState } from "@/lib/landing/engine/scenes";
import type { Skin } from "@/lib/landing/engine/skins";
import { engineSignals } from "@/lib/landing/engine/store";
import { beatAt } from "@/lib/landing/engine/timeline";
import { CH, POSE_LEN, type ArcKey, type SceneId } from "@/lib/landing/engine/types";
import { subscribeToScroll, type ScrollState } from "@/lib/scroll";
import { activeSection } from "@/lib/scroll-spy";
import { registerChapter } from "@/lib/motion/registry";

import { measure, nodes, type Layout } from "./measure";
import { readout, sheetLabel } from "./readouts";
import { createWriter } from "./writes";

/** The chamber's radius as a share of the face's CORE circle (its inner guide circle). */
export const BORE_RATIO = CORE.rInner / (CORE.size / 2);
const DEVELOP_MS = 560;
const DEVELOP_GAP_MS = 1200;

export type Split =
  | { readonly mode: 0 }
  | { readonly mode: 1; readonly y: number }
  | { readonly mode: 2; readonly cx: number; readonly cy: number; readonly r: number };

/** What the live half reads every frame. */
export type DirectorState = {
  layout: Layout | null;
  y: number;
  beat: number;
  accent: ArcKey;
  split: Split;
  ink: [number, number];
  /** The stage's front is moving (a develop): keep rendering. */
  developing: boolean;
};

export type LiveHandle = { readonly wake: () => void; readonly relayout: () => void; readonly dispose: () => void };
export type LiveStarter = (host: { readonly state: DirectorState; readonly root: HTMLElement }) => Promise<LiveHandle | null>;

const ink = (skin: Skin | null) => (skin === "drafting" ? 1 : 0);

export function startDirector(root: HTMLElement, loadLive?: () => Promise<LiveStarter | null>): () => void {
  const html = document.documentElement;
  const n = nodes(root);
  if (!n || html.dataset.anim !== "on") return () => {};
  const { stage, sheetA, sheetB } = n;
  const pin = window.matchMedia(PIN_QUERY);
  const w = createWriter();
  const nav = document.querySelector<HTMLElement>("[data-slot='nav'], nav.nav, header nav");
  const ruler = root.querySelector<HTMLElement>(".zone-ruler");
  const title = root.querySelector<HTMLElement>(".title-block");
  const pricing = root.querySelector<HTMLElement>("#pricing");
  const dial = root.querySelector<HTMLElement>(".pricing-dial");

  const state: DirectorState = { layout: null, y: 0, beat: -1, accent: "lime", split: { mode: 0 }, ink: [0, 0], developing: false };
  let words = -1;
  let passed = -1;
  let chapter: string | null = null;
  let pending = 0;
  let live: LiveHandle | null = null;
  let disposed = false;
  let flipped = false;
  const sceneIn = new Map<SceneId, boolean>();
  /** Each scan front and the scene whose panel its line crosses. */
  let scans: { front: Front; scene: SceneId }[] = [];

  // ---- Develops -----------------------------------------------------------
  type Develop = { from: Skin; to: Skin; forward: boolean; t0: number; cx: number; cy: number; far: number };
  let develop: Develop | null = null;
  let developFrame = 0;
  let lastDevelop = -Infinity;
  let circle = { cx: 0, cy: 0, r: 0 };
  const ring = stage.querySelector<HTMLElement>(".front-ring");

  const settleSheets = (st: StageState) => {
    if (develop) return;
    w.attr(sheetA, "data-skin", st.skin);
    if (st.line !== null && st.next) {
      w.attr(sheetB, "data-skin", st.next);
      w.style(sheetB, "clip-path", `inset(${Math.round(st.line * 2) / 2}px 0 0 0)`);
      w.prop(stage, "--line", `${Math.round(st.line * 2) / 2}px`);
      w.attr(stage, "data-front", "scan");
      state.split = { mode: 1, y: st.line };
      state.ink = [ink(st.skin), ink(st.next)];
    } else {
      w.style(sheetB, "clip-path", "inset(100% 0 0 0)");
      w.attr(stage, "data-front", null);
      state.split = { mode: 0 };
      state.ink = [ink(st.skin), ink(st.skin)];
    }
  };

  const tickDevelop = (now: number) => {
    developFrame = 0;
    const d = develop;
    if (!d) return;
    const p = Math.min(1, (now - d.t0) / DEVELOP_MS);
    const e = 1 - (1 - p) ** 3;
    const r = (d.forward ? e : 1 - e) * d.far;
    w.attr(sheetA, "data-skin", d.from);
    w.attr(sheetB, "data-skin", d.to);
    sheetB.style.clipPath = `circle(${r.toFixed(1)}px at ${d.cx.toFixed(1)}px ${d.cy.toFixed(1)}px)`;
    if (ring) {
      // Its own size (not a scale): the lime hairline stays a hairline.
      ring.style.width = ring.style.height = `${(2 * r).toFixed(1)}px`;
      ring.style.transform = `translate(${(d.cx - r).toFixed(1)}px, ${(d.cy - r).toFixed(1)}px)`;
      ring.style.opacity = String(p < 1 ? (1 - p) * 0.9 : 0);
    }
    state.split = { mode: 2, cx: d.cx, cy: d.cy, r };
    state.ink = [ink(d.to), ink(d.from)];
    state.developing = p < 1;
    live?.wake();
    if (p < 1) {
      developFrame = requestAnimationFrame(tickDevelop);
      return;
    }
    develop = null;
    w.forget(sheetB, "clip-path");
    frame({ y: state.y, progress: 0 });
  };

  const startDevelop = (from: Skin, to: Skin, forward: boolean) => {
    const L = state.layout;
    if (!L) return;
    const now = performance.now();
    const cx = circle.cx || L.vw / 2;
    const cy = circle.cy || L.vh / 2;
    const far = Math.hypot(Math.max(cx, L.vw - cx), Math.max(cy, L.vh - cy));
    if (now - lastDevelop < DEVELOP_GAP_MS || html.dataset.motionFinished !== undefined) {
      // Too soon after the last one (no flashing): cut instead.
      develop = null;
      return;
    }
    lastDevelop = now;
    develop = { from, to, forward, t0: now, cx, cy, far };
    if (!developFrame) developFrame = requestAnimationFrame(tickDevelop);
  };

  // ---- Beats --------------------------------------------------------------
  const applyBeat = (i: number) => {
    const L = state.layout;
    if (!L) return;
    const dom = beatDom(L.res.beats, i, engineSignals.get("studio.mode"));
    const beat = L.res.beats[i];
    state.beat = i;
    state.accent = beat?.accent ?? "lime";
    w.attr(stage, "data-beat", dom.beat);
    w.attr(stage, "data-scene", dom.scene);
    w.attr(stage, "data-accent", dom.accent);
    w.attr(stage, "data-cap", dom.cap === null ? null : String(dom.cap));
    w.attr(stage, "data-complete", dom.complete ? "" : null);
    w.attr(stage, "data-labels", dom.labels);
    for (const el of n.posters) w.attr(el, "data-on", el.getAttribute("data-poster") === dom.poster ? "" : null);
    for (const [id, panel] of n.panels) w.attr(panel, "data-beat", id === dom.scene ? dom.beat : null);
    // Poster placement (the live half overrides the circle and bore every frame).
    const o = i * POSE_LEN;
    const p = L.res.poses;
    circle = { cx: p[o + CH.cx], cy: p[o + CH.cy], r: p[o + CH.cr] };
    if (!live) {
      w.prop(stage, "--ex", `${circle.cx.toFixed(1)}px`);
      w.prop(stage, "--ey", `${circle.cy.toFixed(1)}px`);
      w.prop(stage, "--er", `${circle.r.toFixed(1)}px`);
      w.prop(stage, "--bx", `${circle.cx.toFixed(1)}px`);
      w.prop(stage, "--by", `${circle.cy.toFixed(1)}px`);
      w.prop(stage, "--br", `${(circle.r * BORE_RATIO * p[o + CH.portal]).toFixed(1)}px`);
    }
    if (beat) {
      const box = boxOf(L.grid, beat.box);
      w.prop(stage, "--dx", `${(box.x + p[o + CH.offX] * box.w).toFixed(1)}px`);
      w.prop(stage, "--dy", `${(box.y + p[o + CH.offY] * box.h).toFixed(1)}px`);
      w.prop(stage, "--dw", `${box.w.toFixed(1)}px`);
      w.prop(stage, "--dh", `${box.h.toFixed(1)}px`);
    }
    w.prop(stage, "--dial", `${p[o + CH.dial]}deg`);
    if (title) {
      w.attr(title, "data-beat", dom.beat);
      w.text(title.querySelector("[data-tb-read]"), readout(beat?.id ?? "", L.res.beats));
    }
  };

  const setWords = (i: number) => {
    const L = state.layout;
    if (!L || i === words) return;
    const old = words >= 0 ? n.groups.get(L.res.beats[words].id) : undefined;
    old?.forEach((el) => el.removeAttribute("data-in"));
    words = i;
    const now = i >= 0 ? n.groups.get(L.res.beats[i].id) : undefined;
    now?.forEach((el) => el.setAttribute("data-in", ""));
    // The studio switch flips itself once, agency → Myndstack, the first time it's read.
    if (!flipped && i >= 0 && L.res.beats[i].id === "studio-contrast") {
      flipped = true;
      const sw = root.querySelector<HTMLButtonElement>(".contrast-switch");
      if (sw?.getAttribute("aria-checked") === "true") {
        sw.click();
        window.setTimeout(() => {
          if (sw.getAttribute("aria-checked") === "false") sw.click();
        }, 1100);
      }
    }
  };

  // ---- The frame ------------------------------------------------------------
  const frame = ({ y }: ScrollState) => {
    state.y = y;
    const L = state.layout;
    if (!L) return;
    const next = beatAt(L.res, y, state.beat < 0 ? null : state.beat);
    if (next !== state.beat) applyBeat(next);
    setWords(wordsAt(L.win, y, words));
    for (const [scene, [a, b]] of L.scenes) {
      const was = sceneIn.get(scene) ?? false;
      const band = L.win.band;
      const inside = was ? y >= a - band && y <= b + band : y >= a && y <= b;
      if (inside !== was) {
        sceneIn.set(scene, inside);
        n.furniture.get(scene)?.forEach((el) => w.attr(el, "data-in", inside ? "" : null));
      }
    }

    const st = stageAt(L.fronts, L.res.beats[0].skin, y, L.vh, passed);
    if (st.passed !== passed) {
      const lo = Math.min(passed, st.passed);
      const hi = Math.max(passed, st.passed);
      const forward = st.passed > passed;
      // The one develop crossed (fronts never overlap; a jump across several just cuts).
      const crossed = L.fronts.slice(lo + 1, hi + 1);
      passed = st.passed;
      if (crossed.length === 1 && crossed[0].kind === "develop") {
        const f = crossed[0];
        startDevelop(f.from, f.to, forward);
      } else {
        develop = null;
      }
    }
    settleSheets(st);
    // A scan also converts its scene's designated statements (their twins, at --line).
    for (const { scene, front } of scans) {
      const panel = n.panels.get(scene);
      const start = front.y - front.span / 2;
      const end = front.y + front.span / 2;
      const line = L.vh / 2 - ((y - front.y) * L.vh) / front.span;
      w.prop(panel ?? null, "--line", y < start ? null : y > end ? "0px" : `${Math.round(line * 2) / 2}px`);
    }

    // The chrome takes the skin under it.
    if (nav) w.attr(nav, "data-landing-skin", skinAtRow(st, L.sheets, y, 40));
    if (ruler) w.attr(ruler, "data-skin", skinAtRow(st, L.sheets, y, L.vh / 2));
    if (title) {
      // The title block belongs to the pinned scenes: a sheet covering its row hides it.
      const row = y + L.vh - 40;
      w.attr(title, "data-covered", L.sheets.some((s) => row >= s.top && row < s.bottom) ? "" : null);
      w.attr(title, "data-skin", skinAtRow(st, L.sheets, y, L.vh - 40));
      const c = activeSection(L.chapters, y, L.vh * 0.5) ?? L.chapters[0]?.id ?? null;
      if (c !== chapter) {
        chapter = c;
        const label = sheetLabel(c);
        w.text(title.querySelector("[data-tb-sheet]"), label.sheet);
        w.text(title.querySelector("[data-tb-name]"), label.name);
      }
    }
    live?.wake();
  };

  const relayout = () => {
    pending = 0;
    state.layout = pin.matches ? measure(root) : null;
    const L = state.layout;
    scans = L
      ? L.fronts.filter((f) => f.kind === "scan").map((front) => ({ front, scene: L.res.beats[beatAt(L.res, front.y, null)].scene }))
      : [];
    state.beat = -1;
    words = -1;
    passed = -1;
    chapter = null;
    sceneIn.clear();
    w.reset();
    for (const els of n.groups.values()) els.forEach((el) => el.removeAttribute("data-in"));
    frame({ y: window.scrollY, progress: 0 });
    live?.relayout();
  };
  const schedule = () => {
    if (!pending) pending = requestAnimationFrame(relayout);
  };

  // ---- Signals and delegated listeners ---------------------------------------
  const offSignals = engineSignals.subscribe((key) => {
    if (key === "studio.mode") {
      w.attr(stage, "data-studio", engineSignals.get("studio.mode"));
      if (state.beat >= 0) applyBeat(state.beat);
      live?.wake();
    } else if (key === "pricing.focus" && dial) {
      w.attr(dial, "data-coverage", String(engineSignals.get("pricing.focus")));
    }
  });
  const onPricing = (e: Event) => {
    const target = e.target instanceof Element ? e.target : null;
    const card = target?.closest(".pricing-card");
    if (card && pricing) {
      const i = Array.from(pricing.querySelectorAll(".pricing-card")).indexOf(card);
      if (i >= 0) engineSignals.set("pricing.focus", i);
    } else if (target?.closest("[data-tier-band]")) engineSignals.set("pricing.focus", 3);
  };

  const finish = () => {
    html.dataset.motionFinished = "";
    develop = null;
    if (state.layout) frame({ y: state.y, progress: 0 });
  };
  const unregister = registerChapter(finish);

  // Review and audit hook (`?debug` only): the timeline and the live state, read-only.
  if (new URLSearchParams(window.location.search).has("debug")) {
    (window as unknown as { __msDirector?: DirectorState }).__msDirector = state;
  }

  html.dataset.engine = "poster";
  stage.dataset.intro = "play";
  const introTimer = window.setTimeout(() => delete stage.dataset.intro, 2600);
  const offScroll = subscribeToScroll(frame);
  const ro = new ResizeObserver(schedule);
  ro.observe(document.body);
  document.fonts?.ready.then(schedule);
  const onPageShow = (e: PageTransitionEvent) => {
    if (e.persisted) schedule();
  };
  window.addEventListener("pageshow", onPageShow);
  pin.addEventListener("change", schedule);
  pricing?.addEventListener("pointerover", onPricing);
  pricing?.addEventListener("focusin", onPricing);
  schedule();

  loadLive?.()
    .then((starter) => (starter && !disposed ? starter({ state, root }) : null))
    .then((handle) => {
      if (disposed) handle?.dispose();
      else if (handle) {
        live = handle;
        html.dataset.engine = "live";
      }
    })
    .catch(() => {
      html.dataset.engine = "fallback";
    });

  return () => {
    disposed = true;
    offScroll();
    offSignals();
    unregister();
    ro.disconnect();
    live?.dispose();
    if (pending) cancelAnimationFrame(pending);
    if (developFrame) cancelAnimationFrame(developFrame);
    window.clearTimeout(introTimer);
    window.removeEventListener("pageshow", onPageShow);
    pin.removeEventListener("change", schedule);
    pricing?.removeEventListener("pointerover", onPricing);
    pricing?.removeEventListener("focusin", onPricing);
    w.reset();
    delete html.dataset.engine;
    engineSignals.reset();
  };
}
