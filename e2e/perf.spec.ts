import { expect, test } from "@playwright/test";

/**
 * Runtime health of the landing redesign (/preview): no leaks across soft
 * navigations, and no long animation frames while scrolling the pinned runs
 * on a throttled CPU. Lighthouse never scrolls, so this is the scroll check.
 */
const PREVIEW = "/preview";

type Probe = { __scroll: number; AnimeJS?: { engine: { reqId: number } }[] };

test("soft navigation away and back leaks no listeners or running animation", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as Probe;
    w.__scroll = 0;
    const add = EventTarget.prototype.addEventListener;
    const remove = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (type === "scroll" && this === window) w.__scroll++;
      return add.call(this, type, listener, options);
    };
    EventTarget.prototype.removeEventListener = function (type, listener, options) {
      if (type === "scroll" && this === window) w.__scroll--;
      return remove.call(this, type, listener, options);
    };
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(PREVIEW);
  await expect(page.locator('[data-chapter="core-hero"]')).toHaveAttribute("data-built", "true");

  for (let i = 0; i < 3; i++) {
    await page.locator('footer a[href="/careers"]').first().click();
    await expect(page).toHaveURL(/\/careers$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/preview$/);
    await expect(page.locator('[data-chapter="core-hero"]')).toHaveAttribute("data-built", "true");
  }

  const listeners = await page.evaluate(() => (window as unknown as Probe).__scroll);
  expect(listeners).toBe(1);

  // Leave for good: once the landing unmounts, anime's engine must go idle.
  await page.locator('footer a[href="/careers"]').first().click();
  await expect(page).toHaveURL(/\/careers$/);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as Probe).AnimeJS?.[0]?.engine.reqId ?? 0), {
      timeout: 5000,
    })
    .toBe(0);
});

test("scrolling the pinned runs on a 4× throttled CPU has no very long frames", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "CDP throttling is Chromium-only");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(PREVIEW);
  await expect(page.locator('[data-chapter="core-hero"]')).toHaveAttribute("data-built", "true");

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.evaluate(() => {
    const w = window as unknown as { __loaf: number[] };
    w.__loaf = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) w.__loaf.push(e.duration);
    }).observe({ type: "long-animation-frame", buffered: false });
  });

  // Wheel down through hero, dive, platform and the capabilities run.
  const end = await page.evaluate(() => {
    const caps = document.querySelector('[data-chapter="core-caps"]') as HTMLElement;
    return caps.getBoundingClientRect().bottom + window.scrollY;
  });
  for (let y = 0; y < end; y += 240) {
    await page.mouse.wheel(0, 240);
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(600);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });

  const frames = await page.evaluate(() => (window as unknown as { __loaf: number[] }).__loaf);
  const worst = Math.max(0, ...frames);
  const severe = frames.filter((d) => d > 200).length;
  console.log(`long animation frames: ${frames.length}, worst ${Math.round(worst)}ms, >200ms: ${severe}`);
  expect(severe, `frames over 200ms at 4× CPU: ${frames.map(Math.round).join(", ")}`).toBeLessThanOrEqual(2);
});
