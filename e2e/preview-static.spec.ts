import { expect, test } from "@playwright/test";

import { CAPABILITY_HUES, PLATFORM_LAYERS } from "@/lib/landing/chapters";

import { STAGE, finishAllMotion, seriousViolations, toHold } from "./helpers";

/**
 * The landing without the pinned layout — phones and tablets, reduced motion,
 * `?motion=off`, no JavaScript — where every block carries its own poster in
 * the flow; plus the page-wide axe scans. (e2e/preview.spec.ts covers the
 * pinned page, e2e/preview-audits.spec.ts its composition.)
 */
const PREVIEW = "/preview";
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };
const STATIONS = PLATFORM_LAYERS.map((l) => `st-${l.title.toLowerCase()}`);

test.describe("phones: the static layout", () => {
  test("no stage; every block carries its own poster, and each layer its software", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto(PREVIEW);
    await expect(page.locator(STAGE)).toBeHidden();
    await expect(page.locator(".slot--hero .ep")).toBeVisible();
    const slots = await page.locator(".slot").evaluateAll((els) => els.filter((el) => el.getClientRects().length).length);
    expect(slots).toBeGreaterThanOrEqual(STATIONS.length + CAPABILITY_HUES.length + 2);
    const dive = await page.locator(".beat--dive:not(.beat--twin)").evaluate((el) => (el as HTMLElement).offsetHeight / window.innerHeight);
    expect(dive).toBeLessThan(0.8);
    // Each station's layer card sits in the flow, fully built.
    await expect(page.locator(".layer-card")).toHaveCount(STATIONS.length);
    for (const card of await page.locator(".layer-card").all()) {
      await card.scrollIntoViewIfNeeded();
      await expect(card).toBeVisible();
    }
  });
});

test.describe("posters, and without motion", () => {
  test("under automation the page runs on posters: the canvas never starts, no engine chunk", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(PREVIEW);
    await expect(page.locator("html")).toHaveAttribute("data-engine", "poster");
    await toHold(page, "stack");
    expect(await page.locator(STAGE).getAttribute("data-live")).toBeNull();
    const loaded = await page.evaluate(() => performance.getEntriesByName("engine:module-eval").length);
    expect(loaded).toBe(0);
  });

  test("reduced motion: the static layout, fully built on load", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce", viewport: DESKTOP });
    const page = await context.newPage();
    await page.goto(PREVIEW);
    expect(await page.locator("html").getAttribute("data-anim")).toBeNull();
    expect(await page.locator("html").getAttribute("data-engine")).toBeNull();
    await expect(page.locator(STAGE)).toBeHidden();
    await expect(page.locator(".slot--hero .ep")).toBeVisible();
    await expect(page.locator(".hero-copy .t-lede")).toBeVisible();
    await context.close();
  });

  test("?motion=off: the same static layout on a motion-capable desktop", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(`${PREVIEW}?motion=off`);
    expect(await page.locator("html").getAttribute("data-anim")).toBeNull();
    await expect(page.locator(STAGE)).toBeHidden();
    await expect(page.locator(".slot--hero .ep")).toBeVisible();
  });

  test("JavaScript disabled: no draft state, the ring drawn, unpinned, text present", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: DESKTOP });
    const page = await context.newPage();
    await page.goto(PREVIEW);
    expect(await page.locator("html").getAttribute("data-anim")).toBeNull();
    // The hero's slot shows the still ring, whole.
    await expect(page.locator('.slot--hero use[href="#core-ring-still"]')).toHaveCount(1);
    await expect(page.locator("symbol#core-ring-still")).toHaveCount(1);
    await expect(page.locator(STAGE)).toBeHidden();
    const opacity = await page.locator(".hero-copy .t-lede").evaluate((el) => getComputedStyle(el).opacity);
    expect(opacity).toBe("1");
    await expect(page.locator("h1")).toContainText("Architected and built");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator(".hero-copy .t-lede")).toBeVisible();
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
