import { expect, test } from "@playwright/test";

import { CAPABILITY_HUES, PLATFORM_LAYERS } from "@/lib/landing/chapters";

import { finishAllMotion, seriousViolations, toHold } from "./helpers";

/**
 * The landing without the pinned layout — phones and tablets, reduced motion,
 * `?motion=off`, no JavaScript — where every block carries its own poster in
 * the flow; plus the page-wide axe scans. (e2e/preview.spec.ts covers the
 * pinned page, e2e/preview-audits.spec.ts its composition.)
 */
const PREVIEW = "/preview";
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };
const STAGE = "[data-engine-stage]";
const HERO = "core-hero";
const STATIONS = PLATFORM_LAYERS.map((l) => `st-${l.title.toLowerCase()}`);

test.describe("phones: the static layout", () => {
  test("no stage; the blocks carry their own posters; the hero intro plays once", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto(PREVIEW);
    await expect(page.locator(STAGE)).toBeHidden();
    await expect(page.locator(`[data-chapter="${HERO}"]`)).toHaveAttribute("data-motion", "done", { timeout: 8000 });
    await expect(page.locator(".engine-slot--hero .ep")).toBeVisible();
    const slots = await page.locator(".engine-slot").evaluateAll((els) => els.filter((el) => el.getClientRects().length).length);
    expect(slots).toBeGreaterThanOrEqual(STATIONS.length + CAPABILITY_HUES.length + 2);
    const dive = await page.locator(".dive").evaluate((el) => (el as HTMLElement).offsetHeight / window.innerHeight);
    expect(dive).toBeLessThan(0.8);
    await expect(page.locator(".cap-mini")).toHaveCount(CAPABILITY_HUES.length);
    await expect(page.locator(".cap-mini").first()).toBeVisible();
  });
});

test.describe("posters, and without motion", () => {
  test("under automation the page runs on posters: no canvas, no engine chunk", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(PREVIEW);
    await expect(page.locator("html")).toHaveAttribute("data-engine", "poster");
    await toHold(page, "stack");
    await expect(page.locator("canvas")).toHaveCount(0);
    const loaded = await page.evaluate(() => performance.getEntriesByName("engine:module-eval").length);
    expect(loaded).toBe(0);
  });

  test("reduced motion: static layout, every chapter built on load", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce", viewport: DESKTOP });
    const page = await context.newPage();
    await page.goto(PREVIEW);
    expect(await page.locator("html").getAttribute("data-anim")).toBeNull();
    expect(await page.locator("html").getAttribute("data-engine")).toBeNull();
    await expect(page.locator('[data-chapter]:not([data-motion="done"])')).toHaveCount(0);
    await expect(page.locator(STAGE)).toBeHidden();
    await expect(page.locator(".engine-slot--hero .ep")).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(0);
    await context.close();
  });

  test("?motion=off: the same static layout on a motion-capable desktop", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(`${PREVIEW}?motion=off`);
    expect(await page.locator("html").getAttribute("data-anim")).toBeNull();
    await expect(page.locator('[data-chapter]:not([data-motion="done"])')).toHaveCount(0);
    await expect(page.locator(STAGE)).toBeHidden();
  });

  test("JavaScript disabled: no draft state, the ring drawn, unpinned, text present", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: DESKTOP });
    const page = await context.newPage();
    await page.goto(PREVIEW);
    expect(await page.locator("html").getAttribute("data-anim")).toBeNull();
    const offset = await page
      .locator(".engine-slot--hero .core-arc")
      .first()
      .evaluate((el) => getComputedStyle(el).strokeDashoffset);
    expect(parseFloat(offset)).toBe(0);
    await expect(page.locator(STAGE)).toBeHidden();
    const opacity = await page.locator(".hero-lede").evaluate((el) => getComputedStyle(el).opacity);
    expect(opacity).toBe("1");
    await expect(page.locator("h1")).toContainText("Architected and built");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator(".hero-lede")).toBeVisible();
    await context.close();
  });
});

test.describe("no serious accessibility violations", () => {
  for (const vp of [
    { name: "desktop", ...DESKTOP },
    { name: "mobile", ...PHONE },
  ]) {
    test(`/preview @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(PREVIEW);
      await finishAllMotion(page);
      const found = await seriousViolations(page);
      expect(found, `serious/critical violations:\n${found.join("\n")}`).toEqual([]);
    });
  }
});
