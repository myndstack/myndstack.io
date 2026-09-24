import { expect, test, type Page } from "@playwright/test";

import { BEATS } from "@/lib/landing/engine/beats";

import { clearance, engineHull, introDone, textRects, toHold } from "./helpers";

/**
 * Whole-page audits of the landing's composition (poster mode):
 *
 * - stacking: the layer contract holds (stage 1, panels 2, sheets 3, frame 4,
 *   grain 40, ruler and title block 55, nav 60), no scene or section makes a
 *   stacking context of its own, and every word paints above the engine;
 * - overlap: at every hold, at every pinned size, no words come within 8px of
 *   the engine (and no decorative card reaches past the bezel's outer 15%
 *   into a ring) — and in the static layout, no words sit on any block's own
 *   poster;
 * - dead zones: no screen anywhere down the page shows neither words nor the
 *   engine.
 *
 * Each check first proves it has something to check (a positive
 * precondition), so none of them can pass by finding nothing.
 */
const PREVIEW = "/preview";
// Every beat with a hold takes the page-wide stage (waypoints pass through).
const STAGE_BEATS = BEATS.filter((b) => b.hold > 0);
const PAD = 8;

async function open(page: Page, size: { width: number; height: number }) {
  await page.setViewportSize(size);
  await page.goto(PREVIEW);
  if (size.width >= 1000 && size.height >= 600) await introDone(page);
  // Settle every transition so nothing is mid-rise while we measure.
  await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}" });
}

test.describe("stacking contract", () => {
  test("every layer sits at its contract value; scenes and sections make no stacking context", async ({ page }) => {
    await open(page, { width: 1440, height: 900 });
    const report = await page.evaluate(() => {
      const z = (sel: string) => {
        const el = document.querySelector(sel);
        return el ? getComputedStyle(el).zIndex : "missing";
      };
      const layers = {
        stage: z("[data-engine-stage]"),
        panel: z(".scene > .panel"),
        sheet: z(".sheet"),
        frame: z(".frame"),
        grain: z(".landing-grain"),
        ruler: z(".zone-ruler"),
        title: z(".title-block"),
        nav: z("nav.nav, header nav"),
      };
      const blocks = [
        document.querySelector(".landing")!,
        document.querySelector(".run")!,
        document.querySelector(".flow")!,
        ...Array.from(document.querySelectorAll(".flow > .scene")),
      ].filter((el): el is HTMLElement => el instanceof HTMLElement);
      const contexts = blocks.flatMap((el) => {
        const s = getComputedStyle(el);
        const bad = [
          s.zIndex !== "auto" && `z-index ${s.zIndex}`,
          s.opacity !== "1" && `opacity ${s.opacity}`,
          s.transform !== "none" && "transform",
          s.filter !== "none" && "filter",
          s.isolation !== "auto" && "isolation",
          s.willChange !== "auto" && "will-change",
          /paint|strict|content/.test(s.contain) && `contain ${s.contain}`,
          s.mixBlendMode !== "normal" && "mix-blend-mode",
        ].filter(Boolean);
        return bad.length ? [`${el.id || el.className}: ${bad.join(", ")}`] : [];
      });
      return { layers, checked: blocks.length, contexts };
    });
    expect(report.layers).toEqual({ stage: "1", panel: "2", sheet: "3", frame: "4", grain: "40", ruler: "55", title: "55", nav: "60" });
    expect(report.checked).toBeGreaterThan(8);
    expect(report.contexts).toEqual([]);
  });

  test("every word that's in paints above the engine", async ({ page }) => {
    await open(page, { width: 1440, height: 900 });
    // The stage is never a hit target, so hit-testing would never report it:
    // make it testable while we look (paint order is what's being checked).
    await page.addStyleTag({ content: "[data-engine-stage], [data-engine-stage] * { pointer-events: auto !important }" });
    let checked = 0;
    let underStage = 0;
    for (const id of ["hero", "stack", "cap-1", "work", "build-2", "tools", "studio-contrast"]) {
      await toHold(page, id);
      const result = await page.evaluate(() => {
        const stage = document.querySelector<HTMLElement>("[data-engine-stage]")!;
        // Inert elements are skipped by hit-testing too: lift it while we look.
        stage.inert = false;
        const flow = Array.from(
          document.querySelectorAll<HTMLElement>(
            ":is(.beat[data-in], .furniture[data-in]):not(.beat--twin, .furniture--twin) :is(h1, h2, h3, p, li, a, button, dt, dd)",
          ),
        );
        const buried: string[] = [];
        let n = 0;
        let under = 0;
        for (const el of flow) {
          const r = el.getBoundingClientRect();
          if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight) continue;
          if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
          const x = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1);
          const y = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1);
          const stack = document.elementsFromPoint(x, y);
          const mine = stack.findIndex((e) => e === el || el.contains(e) || e.contains(el));
          const engine = stack.findIndex((e) => stage.contains(e));
          n += 1;
          if (engine >= 0) under += 1;
          if (mine < 0 || (engine >= 0 && engine < mine)) buried.push(el.textContent?.trim().slice(0, 40) ?? el.tagName);
        }
        stage.inert = true;
        return { n, under, buried };
      });
      checked += result.n;
      underStage += result.under;
      expect(result.buried, id).toEqual([]);
    }
    expect(checked).toBeGreaterThan(40);
    // The stage really was under those words (the check could have failed).
    expect(underStage).toBeGreaterThan(20);
  });
});

const PINNED = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
  { width: 1280, height: 600 },
];

test.describe("overlap: no text within 8px of the engine", () => {
  for (const size of PINNED) {
    test(`every hold at ${size.width}×${size.height}`, async ({ page }) => {
      test.slow();
      await open(page, size);
      const hits: string[] = [];
      let lines = 0;
      for (const beat of STAGE_BEATS) {
        await toHold(page, beat.id, beat.id);
        const hull = await engineHull(page);
        if (!hull) throw new Error(`${beat.id}: no engine on screen`);
        const text = await textRects(page);
        lines += text.length;
        for (const t of text) {
          const d = clearance(t, hull);
          // Words keep 8px off the outline; a card may lie on a ring's bezel, never inside 85% of it.
          const limit = t.decor ? (hull.kind === "circle" ? -hull.r * 0.15 : -Infinity) : PAD;
          if (d < limit) hits.push(`${beat.id}: "${t.text}" (${Math.round(d)}px)`);
        }
      }
      expect(lines).toBeGreaterThan(STAGE_BEATS.length * 3);
      expect(hits).toEqual([]);
    });
  }

  for (const size of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
  ]) {
    test(`static layout at ${size.width}×${size.height}: no block's poster under its words`, async ({ page }) => {
      await open(page, size);
      const report = await page.evaluate((pad) => {
        const hit = (a: DOMRect, b: DOMRect) =>
          a.left < b.right + pad && a.right + pad > b.left && a.top < b.bottom + pad && a.bottom + pad > b.top;
        const range = document.createRange();
        // A poster's drawn bounds, clipped to its own slot.
        const posters = Array.from(document.querySelectorAll<HTMLElement>(".slot"))
          .filter((el) => el.getClientRects().length)
          .map((el) => {
            const drawn = (el.querySelector("use, .engine-bezel circle:nth-child(2)") ?? el).getBoundingClientRect();
            // A slot clips its poster (the hero's horizon ring hangs below it, cut off).
            const own = el.getBoundingClientRect();
            const top = Math.max(drawn.top, own.top);
            const bottom = Math.min(drawn.bottom, own.bottom);
            return { el, r: new DOMRect(drawn.left, top, drawn.width, Math.max(0, bottom - top)) };
          });
        const hits: string[] = [];
        const walker = document.createTreeWalker(document.querySelector(".landing")!, NodeFilter.SHOW_TEXT);
        let lines = 0;
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const parent = node.parentElement;
          if (!node.textContent?.trim() || !parent || parent.closest(".slot, .sr-only, .mobile-cta, script, style")) continue;
          if (!parent.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
          range.selectNodeContents(node);
          for (const r of Array.from(range.getClientRects())) {
            if (r.width < 2 || r.height < 2) continue;
            lines += 1;
            for (const p of posters) if (hit(r, p.r)) hits.push(`${p.el.className}: "${node.textContent.trim().slice(0, 30)}"`);
          }
        }
        return { posters: posters.length, lines, hits };
      }, PAD);
      expect(report.posters).toBeGreaterThan(8);
      expect(report.lines).toBeGreaterThan(200);
      expect(report.hits).toEqual([]);
    });
  }
});

test.describe("dead zones", () => {
  for (const size of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    test(`every screen shows words or the engine at ${size.width}×${size.height}`, async ({ page }) => {
      test.slow();
      await open(page, size);
      const { height, vh } = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, vh: innerHeight }));
      const empty: number[] = [];
      let steps = 0;
      for (let y = 0; y <= height - vh; y += vh / 10) {
        await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        steps += 1;
        const shown = await page.evaluate(() => {
          const band = { top: innerHeight * 0.15, bottom: innerHeight * 0.85 };
          const inBand = (r: DOMRect) => r.bottom > band.top && r.top < band.bottom && r.width > 2 && r.height > 2;
          const stage = document.querySelector<HTMLElement>("[data-engine-stage]");
          if (stage && getComputedStyle(stage).display !== "none") {
            const on = stage.querySelector('[data-sheet="a"] [data-on]');
            if (on && inBand(on.getBoundingClientRect())) return true;
          }
          for (const el of document.querySelectorAll(".slot .ep")) {
            if (el.getClientRects().length && inBand(el.getBoundingClientRect())) return true;
          }
          // The whole page's words, the site footer's included (the band keeps
          // the fixed nav and CTA bar out).
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          const range = document.createRange();
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (!node.textContent?.trim() || !node.parentElement?.checkVisibility()) continue;
            if (node.parentElement.closest("script, style, .sr-only, .zone-ruler, .title-block")) continue;
            range.selectNodeContents(node);
            if (Array.from(range.getClientRects()).some(inBand)) return true;
          }
          return false;
        });
        if (!shown) empty.push(Math.round(y));
      }
      expect(steps).toBeGreaterThan(100);
      expect(empty, `empty screens at scroll y = ${empty.join(", ")}`).toEqual([]);
    });
  }
});
