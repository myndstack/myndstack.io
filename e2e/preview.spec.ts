import { expect, test } from "@playwright/test";

import { finishAllMotion, scrollChapterTo, seriousViolations } from "./helpers";

/**
 * The "Blueprint → Build" landing redesign at /preview. These run next to the
 * unchanged "/" suite (smoke.spec.ts), which must stay green throughout — the
 * live homepage is not touched until the swap.
 */
const PREVIEW = "/preview";

test.describe("preview is hidden and self-contained", () => {
  test("noindex (meta + header), own canonical, FAQ JSON-LD, one h1", async ({ page, request }) => {
    const response = await page.goto(PREVIEW);
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/preview$/);
    await expect(page).toHaveTitle(/Preview/);
    expect(await page.locator('script[type="application/ld+json"]').allTextContents()).toEqual(
      expect.arrayContaining([expect.stringContaining('"FAQPage"')]),
    );
    await expect(page.locator("h1")).toHaveCount(1);

    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).not.toContain("/preview");
  });

  test("no intro overlay, no canvas, never inert", async ({ page }) => {
    await page.goto(PREVIEW);
    await expect(page.locator(".loader")).toHaveCount(0);
    await expect(page.locator("canvas")).toHaveCount(0);
    expect(await page.locator("#site").getAttribute("inert")).toBeNull();
  });

  test("the live homepage keeps its intro after visiting the preview first", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(PREVIEW);
    // Soft-navigate to a sub-page: its header is visible at once, no overlay.
    await page.locator('footer a[href="/careers"]').first().click();
    await expect(page).toHaveURL(/\/careers$/);
    await expect(page.locator(".loader")).toHaveCount(0);
    await expect(page.locator("h1")).toBeVisible({ timeout: 1000 });
    await context.close();
  });

  test("nav, drawer and footer anchors stay on the preview", async ({ page }) => {
    await page.goto(PREVIEW);
    await page.locator('.navlink[data-section="pricing"]').click();
    await expect(page).toHaveURL(/\/preview#pricing$/);
    await page.locator(".nav-cta").click();
    await expect(page).toHaveURL(/\/preview#contact$/);
  });
});

test.describe("one scroll loop", () => {
  // lib/scroll.ts listens on window; React 19 (root = document) keeps its own
  // listener on document for onScroll props. anime's onScroll would add another
  // on window — that is what this guards.
  test("exactly one scroll listener on window (the site loop)", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __scroll: { window: number; document: number } };
      w.__scroll = { window: 0, document: 0 };
      const add = EventTarget.prototype.addEventListener;
      const remove = EventTarget.prototype.removeEventListener;
      const key = (t: EventTarget) => (t === window ? "window" : t === document ? "document" : null);
      EventTarget.prototype.addEventListener = function (type, listener, options) {
        const k = key(this);
        if (type === "scroll" && k) w.__scroll[k]++;
        return add.call(this, type, listener, options);
      };
      EventTarget.prototype.removeEventListener = function (type, listener, options) {
        const k = key(this);
        if (type === "scroll" && k) w.__scroll[k]--;
        return remove.call(this, type, listener, options);
      };
    });
    await page.goto(PREVIEW);
    await scrollChapterTo(page, "platform", 0.5);
    await scrollChapterTo(page, "work-cases", 0.5);
    const counts = await page.evaluate(
      () => (window as unknown as { __scroll: { window: number; document: number } }).__scroll,
    );
    expect(counts.window).toBe(1);
    expect(counts.document).toBeLessThanOrEqual(1);
  });
});

test.describe("hero", () => {
  test("the headline is real text from the first paint and the chapter settles", async ({ page }) => {
    await page.goto(PREVIEW, { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toContainText("Architected and built");
    await expect(page.locator('[data-chapter="hero"]')).toHaveAttribute("data-motion", "done", { timeout: 8000 });
  });
});

test.describe("the stack (pinned, scrubbed)", () => {
  test("no ancestor of the sticky element scroll-clips it", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(PREVIEW);
    const clipped = await page.evaluate(() => {
      const sticky = document.querySelector("#platform > [data-sticky]");
      if (!sticky || getComputedStyle(sticky).position !== "sticky") return "no sticky child";
      for (let el = sticky.parentElement; el && el !== document.documentElement; el = el.parentElement) {
        const o = getComputedStyle(el).overflowY;
        if (o === "hidden" || o === "scroll" || o === "auto") return el.id || el.className;
      }
      return null;
    });
    expect(clipped).toBeNull();
  });

  test("layers lock as the scroll builds them", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(PREVIEW);
    const locked = () => page.locator("#platform .stack-layer.is-locked").count();
    await scrollChapterTo(page, "platform", 0);
    await expect.poll(locked).toBe(0);
    await scrollChapterTo(page, "platform", 0.5);
    await expect.poll(locked).toBe(2);
    await scrollChapterTo(page, "platform", 1);
    await expect.poll(locked).toBe(4);
  });

  test("a steady scroll past a finished chapter writes nothing", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(PREVIEW);
    await scrollChapterTo(page, "platform", 1);
    const mutations = await page.evaluate(async () => {
      const root = document.querySelector('[data-chapter="stack"]')!;
      let count = 0;
      // The index rail (SectionIndexRail) owns .ms-index and lights it once as
      // the section becomes current — a state change, not a scroll-frame write.
      const mo = new MutationObserver((records) => {
        count += records.filter((r) => !(r.target as Element).classList?.contains("ms-index")).length;
      });
      mo.observe(root, { attributes: true, childList: true, subtree: true, characterData: true });
      for (let i = 0; i < 10; i++) {
        window.scrollBy({ top: 40, behavior: "instant" });
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      }
      mo.disconnect();
      return count;
    });
    expect(mutations).toBe(0);
  });

  test("a reload mid-chapter restores the built state without scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(PREVIEW);
    await scrollChapterTo(page, "platform", 0.5);
    await page.reload();
    await expect.poll(() => page.locator("#platform .stack-layer.is-locked").count()).toBe(2);
  });
});

test.describe("work pipeline (paper)", () => {
  test("the real metrics count up to exactly the CMS values", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(PREVIEW);
    await scrollChapterTo(page, "work-cases", 1);
    const shown = await page.locator("#work-cases [data-countup]").evaluateAll((els) =>
      els.map((el) => [el.getAttribute("data-countup"), el.getAttribute("data-count")]),
    );
    expect(shown.length).toBeGreaterThan(0);
    for (const [target, count] of shown) expect(count).toBe(target);
  });

  test("case links survive below the pipeline", async ({ page }) => {
    await page.goto(PREVIEW);
    await expect(page.locator('a[href^="/work/"]').first()).toBeVisible();
    await expect(page.locator('section[aria-label="Case studies"] a[href="/work"]')).toBeVisible();
  });
});

test.describe("phones: adapted, not pinned", () => {
  test("no sticky chapters, and the pipeline stays short", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(PREVIEW);
    for (const id of ["platform", "work-cases"]) {
      const position = await page.locator(`#${id} > [data-sticky]`).evaluate((el) => getComputedStyle(el).position);
      expect(position, id).not.toBe("sticky");
    }
    const ratio = await page.evaluate(
      () => document.getElementById("work-cases")!.offsetHeight / window.innerHeight,
    );
    expect(ratio).toBeLessThanOrEqual(1.6);
  });
});

test.describe("without motion", () => {
  test("reduced motion: every chapter is built on load, metrics final", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto(PREVIEW);
    await expect(page.locator('[data-chapter]:not([data-motion="done"])')).toHaveCount(0);
    const shown = await page.locator("[data-countup]").evaluateAll((els) =>
      els.map((el) => el.getAttribute("data-count") === el.getAttribute("data-countup")),
    );
    expect(shown.every(Boolean)).toBe(true);
    await context.close();
  });

  test("JavaScript disabled: no draft state, lines drawn, text present", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(PREVIEW);
    expect(await page.locator("html").getAttribute("data-anim")).toBeNull();
    const offset = await page
      .locator('[data-chapter="hero"] .bp-line')
      .first()
      .evaluate((el) => getComputedStyle(el).strokeDashoffset);
    expect(parseFloat(offset)).toBe(0);
    await expect(page.locator("h1")).toContainText("Architected and built");
    await context.close();
  });
});

test.describe("no serious accessibility violations", () => {
  for (const vp of [
    { name: "desktop", width: 1280, height: 900 },
    { name: "mobile", width: 390, height: 844 },
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
