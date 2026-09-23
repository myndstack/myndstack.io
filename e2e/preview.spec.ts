import { expect, test, type Page } from "@playwright/test";

import { finishAllMotion, scrollChapterTo, seriousViolations, settled, tiltOf } from "./helpers";

/**
 * The "Full Spectrum" landing redesign at /preview. These run next to the
 * unchanged "/" suite (smoke.spec.ts), which must stay green throughout — the
 * live homepage is not touched until the swap.
 */
const PREVIEW = "/preview";
const DESKTOP = { width: 1280, height: 900 };
const PHONE = { width: 390, height: 844 };
const HERO = "core-hero";

/** Scroll to the very end of run A's pinned range (the Core fully dived). */
async function toEndOfDive(page: Page) {
  await scrollChapterTo(page, `[data-chapter="${HERO}"]`, 1);
  await settled(page, HERO);
}

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

  test("no intro overlay, no spine or back-to-top, never inert", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(PREVIEW);
    await expect(page.locator(".loader")).toHaveCount(0);
    await expect(page.locator(".spine-social")).toHaveCount(0);
    await expect(page.locator(".totop")).toHaveCount(0);
    expect(await page.locator("#site").getAttribute("inert")).toBeNull();
  });

  test("the live homepage keeps its spine", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/");
    await expect(page.locator(".spine-social").first()).toBeAttached();
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

  test("nav anchors stay on the preview", async ({ page }) => {
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
    await page.setViewportSize(DESKTOP);
    await page.goto(PREVIEW);
    await toEndOfDive(page);
    await scrollChapterTo(page, "work-cases", 0.5);
    const counts = await page.evaluate(
      () => (window as unknown as { __scroll: { window: number; document: number } }).__scroll,
    );
    expect(counts.window).toBe(1);
    expect(counts.document).toBeLessThanOrEqual(1);
  });
});

test.describe("hero (run A)", () => {
  test("the headline is real text from the first paint and the intro settles", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(PREVIEW, { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toContainText("Architected and built");
    await expect(page.locator("h1")).toContainText("end to end.");
    const hero = page.locator(`[data-chapter="${HERO}"]`);
    await expect(hero).toHaveAttribute("data-intro", "done", { timeout: 8000 });
    await expect(hero).toHaveAttribute("data-motion", "scrub");
    // Every arc drawn once the intro is done.
    const offsets = await page
      .locator(`[data-chapter="${HERO}"] .core-arc`)
      .evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).strokeDashoffset)));
    expect(offsets).toHaveLength(5);
    for (const o of offsets) expect(o).toBeCloseTo(0, 2);
  });

  test("the stage is decoration: aria-hidden, inert, nothing focusable", async ({ page }) => {
    await page.goto(PREVIEW);
    for (const stage of await page.locator("[data-stage]").all()) {
      await expect(stage).toHaveAttribute("aria-hidden", "true");
      expect(await stage.evaluate((el) => (el as HTMLElement).inert)).toBe(true);
      await expect(stage.locator("a, button, input, select, textarea, [tabindex]")).toHaveCount(0);
    }
  });

  test("the copy chip copies the studio email", async ({ browser }) => {
    const context = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
    const page = await context.newPage();
    await page.goto(PREVIEW);
    const chip = page.locator(".copy-chip");
    const email = (await chip.locator("a").textContent())?.trim() ?? "";
    expect(email).toMatch(/@/);
    await chip.getByRole("button", { name: `Copy ${email}` }).click();
    await expect(chip).toHaveAttribute("data-state", "copied");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(email);
    await context.close();
  });
});

test.describe("the dive (pinned, scrubbed)", () => {
  test("the stage is sticky and no ancestor scroll-clips it", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(PREVIEW);
    const clipped = await page.evaluate(() => {
      const stage = document.querySelector(".core-run--hero > [data-stage]");
      if (!stage || getComputedStyle(stage).position !== "sticky") return "no sticky stage";
      for (let el = stage.parentElement; el && el !== document.documentElement; el = el.parentElement) {
        const o = getComputedStyle(el).overflowY;
        if (o === "hidden" || o === "scroll" || o === "auto") return el.id || el.className;
      }
      return null;
    });
    expect(clipped).toBeNull();
  });

  test("the Core tilts back as the page scrolls, and lands at ~68°", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(PREVIEW);
    await expect(page.locator(`[data-chapter="${HERO}"]`)).toHaveAttribute("data-motion", "scrub");
    expect(await tiltOf(page, "[data-core-3d]")).toBeLessThan(1);
    await toEndOfDive(page);
    expect(await tiltOf(page, "[data-core-3d]")).toBeCloseTo(68, 0);
  });

  test("the paper curtain covers the Core by the end of the dive", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(PREVIEW);
    await toEndOfDive(page);
    const top = await page.locator("#platform").evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(top)).toBeLessThanOrEqual(2);
  });

  test("once settled past the run, scrolling writes nothing to it", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(PREVIEW);
    await scrollChapterTo(page, "platform", 0.5);
    await settled(page, HERO);
    const mutations = await page.evaluate(async (id) => {
      const root = document.querySelector(`[data-chapter="${id}"]`)!;
      let count = 0;
      const mo = new MutationObserver((records) => {
        count += records.filter((r) => !(r.target as Element).closest?.("[data-live]")).length;
      });
      mo.observe(root, { attributes: true, childList: true, subtree: true, characterData: true });
      for (let i = 0; i < 10; i++) {
        window.scrollBy({ top: 40, behavior: "instant" });
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      }
      mo.disconnect();
      return count;
    }, HERO);
    expect(mutations).toBe(0);
  });

  test("a reload mid-dive restores the tilt without scrolling", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(PREVIEW);
    await scrollChapterTo(page, `[data-chapter="${HERO}"]`, 0.75);
    await settled(page, HERO);
    const before = await tiltOf(page, "[data-core-3d]");
    expect(before).toBeGreaterThan(20);
    await page.reload();
    await expect.poll(() => tiltOf(page, "[data-core-3d]"), { timeout: 5000 }).toBeGreaterThan(before - 3);
  });
});

test.describe("phones: adapted, not pinned", () => {
  test("no sticky stage, a short dive, and the hero intro plays once", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto(PREVIEW);
    const position = await page
      .locator(".core-run--hero > [data-stage]")
      .evaluate((el) => getComputedStyle(el).position);
    expect(position).not.toBe("sticky");
    const dive = await page
      .locator(".dive")
      .evaluate((el) => (el as HTMLElement).offsetHeight / window.innerHeight);
    expect(dive).toBeLessThan(0.8);
    await expect(page.locator(`[data-chapter="${HERO}"]`)).toHaveAttribute("data-motion", "done", {
      timeout: 8000,
    });
  });
});

test.describe("canvas", () => {
  test("the particle field mounts on desktop when allowed", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __MS_FIELD_TEST: boolean }).__MS_FIELD_TEST = true;
    });
    await page.setViewportSize(DESKTOP);
    await page.goto(PREVIEW);
    await expect(page.locator(`[data-chapter="${HERO}"] canvas.core-canvas`)).toHaveCount(1, { timeout: 8000 });
    await expect(page.locator(`[data-chapter="${HERO}"] [data-stage]`)).toHaveAttribute("data-field", "on");
  });

  test("no canvas under automation by default (budget 0)", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(PREVIEW);
    await expect(page.locator(`[data-chapter="${HERO}"]`)).toHaveAttribute("data-intro", "done", {
      timeout: 8000,
    });
    await expect(page.locator("canvas.core-canvas")).toHaveCount(0);
  });
});

test.describe("without motion", () => {
  test("reduced motion: static layout, every chapter built on load", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce", viewport: DESKTOP });
    const page = await context.newPage();
    await page.goto(PREVIEW);
    expect(await page.locator("html").getAttribute("data-anim")).toBeNull();
    await expect(page.locator('[data-chapter]:not([data-motion="done"])')).toHaveCount(0);
    const position = await page
      .locator(".core-run--hero > [data-stage]")
      .evaluate((el) => getComputedStyle(el).position);
    expect(position).not.toBe("sticky");
    await expect(page.locator("canvas")).toHaveCount(0);
    await context.close();
  });

  test("?motion=off: the same static layout on a motion-capable desktop", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(`${PREVIEW}?motion=off`);
    expect(await page.locator("html").getAttribute("data-anim")).toBeNull();
    await expect(page.locator('[data-chapter]:not([data-motion="done"])')).toHaveCount(0);
    const position = await page
      .locator(".core-run--hero > [data-stage]")
      .evaluate((el) => getComputedStyle(el).position);
    expect(position).not.toBe("sticky");
  });

  // Note: site-wide, the root loading.tsx streams page content into a hidden
  // Suspense segment that only JS reveals (a pre-existing issue, tracked
  // separately) — so this checks the content and the BUILT, UNPINNED styles
  // the static HTML carries, not on-screen visibility.
  test("JavaScript disabled: no draft state, arcs drawn, unpinned, text present", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: DESKTOP });
    const page = await context.newPage();
    await page.goto(PREVIEW);
    expect(await page.locator("html").getAttribute("data-anim")).toBeNull();
    const offset = await page
      .locator(`[data-chapter="${HERO}"] .core-arc`)
      .first()
      .evaluate((el) => getComputedStyle(el).strokeDashoffset);
    expect(parseFloat(offset)).toBe(0);
    const [position, opacity] = await page
      .locator(".core-run--hero")
      .evaluate((run) => [
        getComputedStyle(run.querySelector("[data-stage]")!).position,
        getComputedStyle(run.querySelector(".hero-lede")!).opacity,
      ]);
    expect(position).not.toBe("sticky");
    expect(opacity).toBe("1");
    await expect(page.locator("h1")).toContainText("Architected and built");
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

  test("mid-dive, in the pinned layout", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(PREVIEW);
    await scrollChapterTo(page, `[data-chapter="${HERO}"]`, 0.5);
    await settled(page, HERO);
    const found = await seriousViolations(page, `[data-chapter="${HERO}"]`);
    expect(found, `serious/critical violations:\n${found.join("\n")}`).toEqual([]);
  });
});
