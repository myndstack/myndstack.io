import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/**
 * Shared e2e helpers for the landing redesign. (smoke.spec.ts keeps its own
 * copies until the swap, when it moves onto these.)
 */

/** Where held copy sits: lib/landing/engine/timeline.ts READING. */
export const READING = 0.46;

/** The pinned stage. */
export const STAGE = "[data-engine-stage]";

/**
 * The first load's intro (the ring drawing itself) is over: the director has
 * booted (it stamps `data-engine` and `data-intro` together) and cleared
 * `data-intro` again.
 */
export async function introDone(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("data-engine", /./, { timeout: 8000 });
  await expect.poll(() => page.locator(STAGE).getAttribute("data-intro"), { timeout: 8000 }).toBeNull();
}

/**
 * Finish every landing chapter — the redesign's equivalent of revealAll():
 * once-chapters land on their end state, the stage's overlays complete, and
 * every `.reveal` (the reused live sections) is shown.
 */
export async function finishAllMotion(page: Page) {
  await page.evaluate(() => {
    const s = document.createElement("style");
    s.textContent = "*,*::before,*::after{transition:none!important;animation:none!important}";
    document.head.appendChild(s);
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-in"));
  });
  // Re-dispatch until every chapter reports done: before hydration there are
  // no registered chapters, and the event would simply be lost.
  await page.waitForFunction(
    () => {
      document.dispatchEvent(new Event("motion:finish-all"));
      return document.querySelectorAll('[data-chapter]:not([data-motion="done"])').length === 0;
    },
    undefined,
    { polling: 100 },
  );
}

/** axe serious/critical violations, as "rule → selector" strings. */
export async function seriousViolations(page: Page, include?: string): Promise<string[]> {
  let builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);
  if (include) builder = builder.include(include);
  const { violations } = await builder.analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .flatMap((v) => v.nodes.map((n) => `${v.id} → ${n.target.join(" ")}`))
    .sort();
}

/**
 * Scroll so an element sits at `fraction` of its run (height − viewport).
 * `target` is an id, or any selector. Instant: the site sets
 * `scroll-behavior: smooth`, and a smooth glide would still be moving while
 * the test measures.
 */
export async function scrollChapterTo(page: Page, target: string, fraction: number) {
  // Scroll only once the target has layout: scrolling before the page is
  // laid out clamps to the top.
  await page.waitForFunction(
    (sel) => {
      const el = (document.getElementById(sel) ?? document.querySelector(sel)) as HTMLElement | null;
      return !!el && el.offsetHeight > 0;
    },
    target,
    { polling: 50 },
  );
  await page.evaluate(
    ([sel, f]) => {
      const el = (document.getElementById(sel as string) ?? document.querySelector(sel as string)) as HTMLElement;
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: top + (el.offsetHeight - window.innerHeight) * (f as number),
        behavior: "instant",
      });
    },
    [target, fraction] as const,
  );
}

/**
 * Scroll to a beat's hold: its marker's centre on the reading line. With
 * `beat`, wait until the stage holds it (docks leave the stage as it was).
 */
export async function toHold(page: Page, marker: string, beat: string | null = marker) {
  await page.waitForFunction(
    (id) => {
      const el = document.querySelector<HTMLElement>(`[data-beat-marker="${id}"]`);
      return !!el && el.offsetParent !== null;
    },
    marker,
    { polling: 50 },
  );
  await page.evaluate(
    ([id, reading]) => {
      const el = document.querySelector<HTMLElement>(`[data-beat-marker="${id}"]`)!;
      const r = el.getBoundingClientRect();
      const y = r.top + window.scrollY + r.height / 2 - window.innerHeight * (reading as number);
      window.scrollTo({ top: Math.max(0, y), behavior: "instant" });
    },
    [marker, READING] as const,
  );
  if (beat) await expect(page.locator("[data-engine-stage]")).toHaveAttribute("data-beat", beat);
}

export type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

/**
 * Every visible line of text on the page, in viewport px: the words of the
 * beats that are in (and every flowing section's), not the engine's own
 * overlays, nor the page chrome that floats above it (nav, ruler, title
 * block, CTA bar). A beat that isn't in has its words masked out of sight.
 * `decor` marks the aria-hidden cards (specs, layer cards, the delivery
 * card): they may sit on the bezel, never in the bore.
 */
export async function textRects(page: Page): Promise<(Rect & { readonly text: string; readonly decor: boolean })[]> {
  return page.evaluate(() => {
    const out: { x: number; y: number; w: number; h: number; text: string; decor: boolean }[] = [];
    const skip =
      "[data-engine-stage], .slot, .zone-ruler, .title-block, .mobile-cta, script, style, .sr-only, .beat:not([data-in]), .furniture:not([data-in]), .beat--twin, .furniture--twin";
    const root = document.querySelector(".landing");
    if (!root) return out;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim() ?? "";
      const parent = node.parentElement;
      if (!text || !parent || parent.closest(skip)) continue;
      if (!parent.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const decor = !!parent.closest('[aria-hidden="true"]');
      range.selectNodeContents(node);
      for (const r of Array.from(range.getClientRects())) {
        if (r.width < 2 || r.height < 2) continue;
        if (r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) continue;
        out.push({ x: r.left, y: r.top, w: r.width, h: r.height, text: text.slice(0, 40), decor });
      }
    }
    return out;
  });
}

export type Hull = ({ readonly kind: "circle"; readonly cx: number; readonly cy: number; readonly r: number } | ({ readonly kind: "rect" } & Rect));

/**
 * The engine's outline on screen in poster mode: the ring out to its bezel
 * (a circle), or the drawing the stage shows (its <use> reports the drawn
 * bounds).
 */
export async function engineHull(page: Page): Promise<Hull | null> {
  return page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>("[data-engine-stage]");
    if (!stage || getComputedStyle(stage).display === "none") return null;
    const on = stage.querySelector<HTMLElement | SVGElement>('[data-sheet="a"] [data-poster][data-on]');
    if (!on) return null;
    if (on.matches(".engine-face")) {
      const r = (on.querySelector(".engine-bezel circle:nth-child(2)") ?? on).getBoundingClientRect();
      return { kind: "circle" as const, cx: r.left + r.width / 2, cy: r.top + r.height / 2, r: r.width / 2 };
    }
    const r = (on.querySelector("use") ?? on).getBoundingClientRect();
    return { kind: "rect" as const, x: r.left, y: r.top, w: r.width, h: r.height };
  });
}

/** How far a text rect stays outside the hull, px (negative: inside it). */
export function clearance(t: Rect, hull: Hull): number {
  if (hull.kind === "circle") {
    const dx = Math.max(t.x - hull.cx, 0, hull.cx - (t.x + t.w));
    const dy = Math.max(t.y - hull.cy, 0, hull.cy - (t.y + t.h));
    return Math.hypot(dx, dy) - hull.r;
  }
  const dx = Math.max(hull.x - (t.x + t.w), 0, t.x - (hull.x + hull.w));
  const dy = Math.max(hull.y - (t.y + t.h), 0, t.y - (hull.y + hull.h));
  return dx > 0 || dy > 0 ? Math.hypot(dx, dy) : -1;
}
