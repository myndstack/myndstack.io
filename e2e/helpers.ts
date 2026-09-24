import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/**
 * Shared e2e helpers for the landing redesign. (smoke.spec.ts keeps its own
 * copies until the swap, when it moves onto these.)
 */

/** Where held copy sits: lib/landing/engine/choreography.ts READING. */
export const READING = 0.46;

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
 * Every visible line of text on the page, in viewport px: the flow's words
 * (decorative ones included — they're on screen too), not the engine's own
 * overlays, nor the page chrome that floats above it (nav, ruler, CTA bar).
 */
export async function textRects(page: Page): Promise<(Rect & { readonly text: string })[]> {
  return page.evaluate(() => {
    const out: { x: number; y: number; w: number; h: number; text: string }[] = [];
    const skip = "[data-engine-stage], .engine-dock, .engine-slot, .ruler, .mobile-cta, script, style, .sr-only";
    const root = document.querySelector(".landing");
    if (!root) return out;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim() ?? "";
      const parent = node.parentElement;
      if (!text || !parent || parent.closest(skip)) continue;
      if (!parent.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      range.selectNodeContents(node);
      for (const r of Array.from(range.getClientRects())) {
        if (r.width < 2 || r.height < 2) continue;
        if (r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) continue;
        out.push({ x: r.left, y: r.top, w: r.width, h: r.height, text: text.slice(0, 40) });
      }
    }
    return out;
  });
}

/**
 * The engine's hull on screen in poster mode: the drawing the stage shows
 * (its <use> reports the drawn bounds), or the ring out to its bezel.
 */
export async function engineHull(page: Page): Promise<Rect | null> {
  return page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>("[data-engine-stage]");
    if (!stage || getComputedStyle(stage).display === "none") return null;
    const on = stage.querySelector<HTMLElement | SVGElement>(".engine-tone--dark [data-poster][data-on], .engine-face[data-on]");
    if (!on) return null;
    const target = on.matches(".engine-face") ? on.querySelector(".engine-bezel circle:nth-child(2)") : on.querySelector("use");
    const r = (target ?? on).getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });
}

export function intersects(a: Rect, b: Rect, pad = 0): boolean {
  return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
}
