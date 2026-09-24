import { expect, test, type Page } from "@playwright/test";

import { CAPABILITY_HUES, PLATFORM_LAYERS } from "@/lib/landing/chapters";
import { BEATS } from "@/lib/landing/engine/beats";
import { DRAW_POSTERS } from "@/lib/landing/engine/posters";

import { READING, seriousViolations, toHold } from "./helpers";

/**
 * The landing redesign at /preview, in poster mode: under automation the live
 * engine never loads, so every beat shows its poster. (The live engine has
 * its own project, e2e/engine/.) The unchanged "/" suite (smoke.spec.ts) runs
 * beside this one and must stay green throughout.
 */
const PREVIEW = "/preview";
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };
const STAGE = "[data-engine-stage]";
const HERO = "core-hero";
const STAGE_BEATS = BEATS.filter((b) => b.host === "stage");
const STATIONS = PLATFORM_LAYERS.map((l) => `st-${l.title.toLowerCase()}`);

async function openPinned(page: Page) {
  await page.setViewportSize(DESKTOP);
  await page.goto(PREVIEW);
  await expect(page.locator("html")).toHaveAttribute("data-engine", "poster");
}

const opacity = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => parseFloat(getComputedStyle(el).opacity));

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
    await expect(page.locator("h1")).toBeVisible({ timeout: 5000 });
    await expect(page.locator(".loader")).toHaveCount(0);
    await context.close();
  });

  test("nav anchors stay on the preview", async ({ page }) => {
    await page.goto(PREVIEW);
    await page.locator('.navlink[data-section="pricing"]').click();
    await expect(page).toHaveURL(/\/preview#pricing$/);
    // Fresh load for the CTA: after scrolling down the nav tucks away.
    await page.goto(PREVIEW);
    await page.locator(".nav-cta").click();
    await expect(page).toHaveURL(/\/preview#contact$/);
  });
});

test.describe("one scroll loop", () => {
  // lib/scroll.ts listens on window; React 19 (root = document) keeps its own
  // listener on document for onScroll props. Anything else on window is a
  // second loop — that is what this guards.
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
    await openPinned(page);
    for (const id of ["stack", "cap-2", "work", "build-3"]) await toHold(page, id);
    const counts = await page.evaluate(
      () => (window as unknown as { __scroll: { window: number; document: number } }).__scroll,
    );
    expect(counts.window).toBe(1);
    expect(counts.document).toBeLessThanOrEqual(1);
  });
});

test.describe("hero", () => {
  test("the headline is real text from the first paint, and the intro plays once", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(PREVIEW, { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toContainText("Architected and built");
    await expect(page.locator("h1")).toContainText("end to end.");
    const hero = page.locator(`[data-chapter="${HERO}"]`);
    await expect(hero).toHaveAttribute("data-motion", "done", { timeout: 8000 });
    // The stage's ring drew itself: every arc on.
    const offsets = await page
      .locator(`${STAGE} [data-poster="face-ring"] .core-arc`)
      .evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).strokeDashoffset)));
    expect(offsets).toHaveLength(5);
    for (const o of offsets) expect(o).toBeCloseTo(0, 2);
    // Away and back: it stays played.
    await toHold(page, "stack");
    await toHold(page, "hero");
    await expect(hero).toHaveAttribute("data-motion", "done");
  });

  test("the stage is decoration: aria-hidden, inert, nothing focusable, no words", async ({ page }) => {
    await page.goto(PREVIEW);
    const stage = page.locator(STAGE);
    await expect(stage).toHaveAttribute("aria-hidden", "true");
    expect(await stage.evaluate((el) => (el as HTMLElement).inert)).toBe(true);
    await expect(stage.locator("a, button, input, select, textarea, [tabindex]")).toHaveCount(0);
    await expect(stage.locator("h1, h2, h3, h4, li, p")).toHaveCount(0);
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

test.describe("the stage (pinned)", () => {
  test("it sticks for the whole run, hero to studio, and nothing scroll-clips it", async ({ page }) => {
    await openPinned(page);
    const clipped = await page.evaluate((sel) => {
      const stage = document.querySelector(sel);
      if (!stage || getComputedStyle(stage).position !== "sticky") return "no sticky stage";
      for (let el = stage.parentElement; el && el !== document.documentElement; el = el.parentElement) {
        const o = getComputedStyle(el).overflowY;
        if (o === "hidden" || o === "scroll" || o === "auto") return el.id || el.className;
      }
      const run = stage.parentElement!;
      return run.contains(document.getElementById("top")) && run.contains(document.getElementById("team"))
        ? null
        : "the run doesn't span hero → studio";
    }, STAGE);
    expect(clipped).toBeNull();
  });

  test("every stage beat holds its own poster", async ({ page }) => {
    test.slow();
    await openPinned(page);
    expect(STAGE_BEATS.length).toBeGreaterThanOrEqual(20);
    for (const beat of STAGE_BEATS) {
      await toHold(page, beat.marker, beat.id);
      const shown = await page
        .locator(`${STAGE} [data-poster][data-on]`)
        .evaluateAll((els) => [...new Set(els.map((el) => (el as HTMLElement).dataset.poster))]);
      const expected = beat.fit === "circle" ? (beat.box === "ringTop" ? "face-top" : "face-ring") : beat.id;
      expect(shown, beat.id).toEqual([expected]);
    }
  });

  test("at the paper's edge the drawing splits exactly where the page does", async ({ page }) => {
    await openPinned(page);
    // Halfway between the dive and the stack, the paper's top edge is on screen.
    await toHold(page, "dive");
    const y = await page.evaluate(() => {
      const platform = document.getElementById("platform")!;
      return platform.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.55;
    });
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
    await expect
      .poll(() =>
        page.evaluate((sel) => {
          const edge = document.getElementById("platform")!.getBoundingClientRect().top;
          const pt = parseFloat(getComputedStyle(document.querySelector(sel)!).getPropertyValue("--pt"));
          return Math.abs(pt - edge);
        }, STAGE),
      )
      .toBeLessThanOrEqual(1);
  });

  test("settled inside a hold, scrolling writes nothing to the page", async ({ page }) => {
    await openPinned(page);
    // The intro (time-based, once) must be over: it writes by design.
    await expect(page.locator(`[data-chapter="${HERO}"]`)).toHaveAttribute("data-motion", "done", { timeout: 8000 });
    await toHold(page, STATIONS[1]);
    await page.waitForTimeout(400);
    const mutations = await page.evaluate(async () => {
      let count = 0;
      const mo = new MutationObserver((records) => {
        count += records.filter((r) => !(r.target as Element).closest?.("[data-live]")).length;
      });
      mo.observe(document.querySelector(".landing")!, { attributes: true, childList: true, subtree: true, characterData: true });
      for (let i = 0; i < 8; i++) {
        window.scrollBy({ top: 12, behavior: "instant" });
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      }
      mo.disconnect();
      return count;
    });
    expect(mutations).toBe(0);
  });

  test("beats change paint, never layout", async ({ page }) => {
    await openPinned(page);
    const heights = new Set<number>();
    for (const id of ["hero", "stack", STATIONS[3], "cap-1", "work", "build-2", "studio"]) {
      await toHold(page, id);
      heights.add(await page.evaluate(() => document.documentElement.scrollHeight));
    }
    expect(heights.size).toBe(1);
  });

  // A page that arrives already scrolled (restored scroll, anchor, bfcache)
  // must show the right beat straight away, without waiting for a scroll.
  test("a page that loads mid-run shows the right beat without scrolling", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.addInitScript(
      ([marker, reading]) => {
        history.scrollRestoration = "manual";
        const tryScroll = () => {
          const el = document.querySelector<HTMLElement>(`[data-beat-marker="${marker}"]`);
          if (!el || el.offsetHeight === 0) return requestAnimationFrame(tryScroll);
          const r = el.getBoundingClientRect();
          scrollTo({ top: r.top + scrollY + r.height / 2 - innerHeight * (reading as number), behavior: "instant" });
        };
        addEventListener("DOMContentLoaded", tryScroll);
      },
      [STATIONS[2], READING] as const,
    );
    await page.goto(PREVIEW);
    await expect(page.locator(STAGE)).toHaveAttribute("data-beat", STATIONS[2], { timeout: 5000 });
  });
});

test.describe("the stack (paper)", () => {
  test("the nav's Stack link lands on the overview's hold", async ({ page }) => {
    await openPinned(page);
    await page.locator('.navlink[data-section="platform"]').click();
    await expect(page).toHaveURL(/#platform-anchor$/);
    await expect(page.locator(STAGE)).toHaveAttribute("data-beat", "stack", { timeout: 10_000 });
    await expect(page.locator(STAGE)).toHaveAttribute("data-labels", "stack");
  });

  test("each station pulls out its own layer, annotated", async ({ page }) => {
    await openPinned(page);
    for (const id of STATIONS) {
      await toHold(page, id);
      await expect(page.locator(STAGE)).toHaveAttribute("data-labels", "annot");
      await expect(page.locator(`${STAGE} .engine-tone--paper [data-poster="${id}"]`)).toHaveAttribute("data-on", "");
    }
    await toHold(page, "locked");
  });

  test("paper passes axe at a station", async ({ page }) => {
    await openPinned(page);
    await toHold(page, STATIONS[1]);
    const found = await seriousViolations(page, "#platform");
    expect(found, `serious/critical violations:\n${found.join("\n")}`).toEqual([]);
  });
});

test.describe("capabilities", () => {
  test("each chapter lights its own hue, and the finale completes the spectrum", async ({ page }) => {
    await openPinned(page);
    const caps = page.locator("#capabilities");
    for (let i = 0; i < CAPABILITY_HUES.length; i++) {
      const hue = CAPABILITY_HUES[i];
      await toHold(page, `cap-${i}`);
      await expect(caps).toHaveAttribute("data-cap-active", String(i));
      await expect(caps).toHaveAttribute("data-hue", hue);
      await expect.poll(() => opacity(page, `${STAGE} .engine-ringtop .core-arc[data-arc="${hue}"]`)).toBeGreaterThan(0.9);
      await expect.poll(() => opacity(page, `${STAGE} [data-panel="${i}"]`)).toBeGreaterThan(0.9);
      await expect.poll(() => opacity(page, `${STAGE} [data-demo="${i}"]`)).toBeGreaterThan(0.9);
    }
    await toHold(page, "finale");
    await expect(caps).toHaveAttribute("data-complete", "true");
    await expect(caps).toHaveAttribute("data-hue", "spectrum");
  });

  test("every capability is in the flow", async ({ page }) => {
    await page.goto(PREVIEW);
    await expect(page.locator("#capabilities h3")).toHaveCount(CAPABILITY_HUES.length);
  });

  test("axe passes mid-chapter on graphite", async ({ page }) => {
    await openPinned(page);
    await toHold(page, "cap-1");
    const found = await seriousViolations(page, "#capabilities");
    expect(found, `serious/critical violations:\n${found.join("\n")}`).toEqual([]);
  });
});

test.describe("work, process, tools", () => {
  test("the case metrics settle on exactly the CMS values, and the case links", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(PREVIEW);
    await page.locator("#work-cases").scrollIntoViewIfNeeded();
    await expect(page.locator('[data-chapter="cases"]')).toHaveAttribute("data-motion", "done", { timeout: 10_000 });
    const shown = await page
      .locator("#work-cases [data-countup]")
      .evaluateAll((els) => els.map((el) => [el.getAttribute("data-countup"), el.textContent]));
    expect(shown.length).toBeGreaterThan(0);
    for (const [target, text] of shown) expect(text).toBe(target);
    await expect(page.locator('#work-cases a[href^="/work/"]')).toBeVisible();
  });

  test("process: each step lights as the engine is built", async ({ page }) => {
    await openPinned(page);
    const process = page.locator("#process");
    let fill = -1;
    for (let n = 1; n <= 4; n++) {
      await toHold(page, `build-${n}`);
      await expect(process).toHaveAttribute("data-step", String(n));
      await expect
        .poll(() => page.locator(`#process .step[data-n="${n}"] .step-n`).evaluate((el) => getComputedStyle(el).color))
        .toBe("rgb(201, 242, 77)");
      await page.waitForTimeout(650);
      const next = await page
        .locator("#process .steps")
        .evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el, "::after").transform).d);
      expect(next).toBeGreaterThan(fill);
      fill = next;
    }
    await toHold(page, "tools");
    await expect(process).toHaveAttribute("data-step", "4");
  });

  test("tools: every vendor is named in text, on paper, beside the elevation", async ({ page }) => {
    await openPinned(page);
    await expect(page.locator("#integrations .rack-group")).toHaveCount(4);
    await expect(page.locator("#integrations .rack-name")).toHaveCount(21);
    await expect(page.locator("#integrations")).toHaveAttribute("data-surface", "paper");
    await toHold(page, "tools");
    await expect(page.locator(STAGE)).toHaveAttribute("data-labels", "ports");
  });
});

test.describe("studio, pricing, faq, contact", () => {
  test("the founder panel shows only real people; the switch moves the emphasis and the engine", async ({ page }) => {
    await openPinned(page);
    await expect(page.locator("#team")).not.toContainText("Adding soon");
    await expect(page.locator("#team .founder-name").first()).toBeVisible();
    await toHold(page, "studio");
    const sw = page.getByRole("switch", { name: "Show how Myndstack does it" });
    await expect(sw).toHaveAttribute("aria-checked", "true");
    await sw.click();
    await expect(sw).toHaveAttribute("aria-checked", "false");
    await expect(page.locator(".contrast")).toHaveAttribute("data-state", "agency");
    await expect(page.locator(STAGE)).toHaveAttribute("data-studio", "agency");
    await expect(page.locator(`${STAGE} .engine-tone--dark [data-poster="studio-agency"]`)).toHaveAttribute("data-on", "");
    // Both answers stay readable either way.
    await expect(page.locator(".contrast-table td")).toHaveCount(10);
  });

  test("pricing keeps its logic; the dial follows the tier in focus", async ({ page }) => {
    await openPinned(page);
    await expect(page.locator('#pricing a[href^="/pricing/"]').first()).toBeVisible();
    await expect(page.locator('#pricing a[href="#contact"]').first()).toBeAttached();
    await expect(page.locator("#pricing select")).toHaveCount(1);
    const dock = page.locator('[data-host="dock-pricing"]');
    await expect(dock).toHaveAttribute("data-focus", "0");
    await page.locator("#pricing .pricing-card").nth(1).hover();
    await expect(dock).toHaveAttribute("data-focus", "1");
    await expect.poll(() => opacity(page, '[data-host="dock-pricing"] .core-mini-arc[data-arc="product"]')).toBe(1);
  });

  test("faq is a working accordion, and its dial points at the open question", async ({ page }) => {
    await openPinned(page);
    const buttons = page.locator("#faq .faq-q button");
    await expect(buttons.first()).toHaveAttribute("aria-expanded", "true");
    await buttons.nth(1).click();
    await expect(buttons.nth(1)).toHaveAttribute("aria-expanded", "true");
    await expect(buttons.first()).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator('[data-host="dock-faq"]')).toHaveAttribute("data-open", "1");
  });

  test("contact: the form is server-rendered; no tabs without a Cal link", async ({ page }) => {
    await page.goto(PREVIEW);
    await expect(page.locator("#contact form")).toHaveCount(1);
    await expect(page.locator('#contact [role="tablist"]')).toHaveCount(0);
  });

  test("no element id is duplicated, and every drawing is defined once", async ({ page }) => {
    await page.goto(PREVIEW);
    const dupes = await page.evaluate(() => {
      const seen = new Map<string, number>();
      document.querySelectorAll("[id]").forEach((el) => seen.set(el.id, (seen.get(el.id) ?? 0) + 1));
      return [...seen].filter(([, n]) => n > 1).map(([id]) => id);
    });
    expect(dupes).toEqual([]);
    await expect(page.locator(".engine-sprite symbol")).toHaveCount(DRAW_POSTERS.length);
    const dangling = await page.locator("use").evaluateAll((uses) =>
      uses.map((u) => u.getAttribute("href") ?? "").filter((href) => !document.querySelector(href)),
    );
    expect(dangling).toEqual([]);
  });
});

test.describe("chrome: ruler and mobile bar", () => {
  test("the ruler follows the page, takes the paper's skin, and its ticks navigate + move focus", async ({ page }) => {
    await openPinned(page);
    const ruler = page.getByRole("navigation", { name: "Chapters" });
    await expect(ruler).toBeVisible();
    await toHold(page, "stack");
    await expect(ruler).toHaveAttribute("data-skin", "paper");
    await ruler.getByRole("button", { name: "Chapter 08: Pricing" }).click();
    await expect(page.locator("#pricing")).toBeFocused();
    await expect.poll(() => page.evaluate(() => document.getElementById("pricing")!.getBoundingClientRect().top)).toBeLessThan(120);
    await expect(ruler.locator('[aria-current="true"]')).toHaveAttribute("data-id", "pricing");
    await expect(ruler).toHaveAttribute("data-skin", "ink");
  });

  test("phones: the CTA bar appears after the hero and steps aside over pricing", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto(PREVIEW);
    const bar = page.locator(".mobile-cta");
    await expect(bar).not.toHaveClass(/is-shown/);
    await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 3, behavior: "instant" }));
    await expect(bar).toHaveClass(/is-shown/);
    await page.evaluate(() => document.getElementById("pricing")!.scrollIntoView({ behavior: "instant", block: "center" }));
    await expect(bar).not.toHaveClass(/is-shown/);
    await expect(page.locator(".ruler")).toBeHidden();
  });
});
