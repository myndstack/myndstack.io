import { expect, test, type Page } from "@playwright/test";

import { INTEGRATIONS } from "@/lib/content";
import { CAPABILITY_HUES, CAPABILITY_ROUTES, PLATFORM_LAYERS } from "@/lib/landing/chapters";
import { BEATS } from "@/lib/landing/engine/beats";
import { DRAW_POSTERS } from "@/lib/landing/engine/posters";
import { SPRITE_URL } from "@/lib/landing/engine/sprite";

import { READING, STAGE, introDone, seriousViolations, toHold } from "./helpers";

/**
 * The landing redesign at /preview, in poster mode: under automation the live
 * engine never loads, so every beat shows its poster. (The live engine has
 * its own project, e2e/engine/.) The unchanged "/" suite (smoke.spec.ts) runs
 * beside this one and must stay green throughout.
 */
const PREVIEW = "/preview";
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };
// Every beat with a hold takes the page-wide stage (waypoints pass through).
const STAGE_BEATS = BEATS.filter((b) => b.hold > 0);
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

  test("the landing's styles never load on the live homepage", async ({ page, request }) => {
    const LANDING = /\.landing\b|\.ms-grid\b|data-engine-stage|\.layer-card\b/;
    const styles = async (path: string) => {
      await page.goto(path);
      const hrefs = await page.locator('link[rel="stylesheet"]').evaluateAll((links) => links.map((l) => (l as HTMLLinkElement).href));
      return Promise.all(hrefs.map(async (href) => ({ href, css: await (await request.get(href)).text() })));
    };
    // The pattern does find the landing's own styles (so the check below can fail)…
    expect((await styles(PREVIEW)).some((s) => LANDING.test(s.css))).toBe(true);
    // …and none of them reach "/".
    const home = await styles("/");
    expect(home.length).toBeGreaterThan(0);
    expect(home.filter((s) => LANDING.test(s.css)).map((s) => s.href)).toEqual([]);
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
  test("the headline is real text from the first paint; the ring draws once and its bore ships the stack", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(PREVIEW, { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toContainText("Architected and built");
    await expect(page.locator("h1")).toContainText("end to end.");
    await introDone(page);
    await expect(page.locator(".beat--hero")).toHaveAttribute("data-in", "");
    // The ring drew itself: every arc on.
    const offsets = await page
      .locator(`${STAGE} [data-sheet="a"] [data-poster="face"] .core-arc`)
      .evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).strokeDashoffset)));
    expect(offsets).toHaveLength(5);
    for (const o of offsets) expect(o).toBeCloseTo(0, 2);
    // The bore is open onto the chamber, and the terminal has printed every layer.
    await expect.poll(() => opacity(page, `${STAGE} .ship-console`)).toBe(1);
    await expect
      .poll(() => page.locator(`${STAGE} .ship-console .sc-line`).evaluateAll((els) => els.filter((el) => getComputedStyle(el).clipPath.includes("100%")).length))
      .toBe(0);
    await expect(page.locator(`${STAGE} .ship-console .sc-key`)).toHaveText(PLATFORM_LAYERS.map((l) => l.title.toLowerCase()));
    // Away and back: the intro doesn't replay.
    await toHold(page, "stack");
    await toHold(page, "hero");
    expect(await page.locator(STAGE).getAttribute("data-intro")).toBeNull();
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
    const context = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"], viewport: DESKTOP });
    const page = await context.newPage();
    await page.goto(PREVIEW);
    await introDone(page);
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

  test("every stage beat holds its own poster, on its own skin", async ({ page }) => {
    test.slow();
    await openPinned(page);
    expect(STAGE_BEATS.length).toBeGreaterThanOrEqual(20);
    for (const beat of STAGE_BEATS) {
      await toHold(page, beat.id, beat.id);
      // (Polled: the studio's switch flips itself once as its words come in.)
      await expect
        .poll(() =>
          page.locator(`${STAGE} [data-sheet="a"] [data-poster][data-on]`).evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.poster)),
        )
        .toEqual([beat.fit === "circle" ? "face" : beat.id]);
      await expect(page.locator(`${STAGE} [data-sheet="a"]`), beat.id).toHaveAttribute("data-skin", beat.skin);
    }
  });

  test("mid-scan, the paper starts exactly at the front's line", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    // ?debug exposes the director's timeline: scroll to the first scan's middle.
    await page.goto(`${PREVIEW}?debug`);
    await expect(page.locator("html")).toHaveAttribute("data-engine", "poster");
    const y = await page.evaluate(() => {
      const d = (window as unknown as { __msDirector?: { layout: { fronts: { kind: string; y: number }[] } | null } }).__msDirector;
      return d?.layout?.fronts.find((f) => f.kind === "scan")?.y ?? null;
    });
    expect(y).not.toBeNull();
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y as number);
    await expect(page.locator(STAGE)).toHaveAttribute("data-front", "scan");
    const { line, clip } = await page.evaluate((sel) => {
      const stage = document.querySelector<HTMLElement>(sel)!;
      const b = stage.querySelector<HTMLElement>('[data-sheet="b"]')!;
      return {
        line: parseFloat(getComputedStyle(stage).getPropertyValue("--line")),
        clip: parseFloat(/inset\(([\d.]+)px/.exec(b.style.clipPath)?.[1] ?? "NaN"),
      };
    }, STAGE);
    expect(line).toBeGreaterThan(0);
    expect(line).toBeLessThan(DESKTOP.height);
    expect(Math.abs(line - clip)).toBeLessThanOrEqual(0.5);
    await expect(page.locator(`${STAGE} [data-sheet="b"]`)).toHaveAttribute("data-skin", "drafting");
  });

  test("settled inside a hold, scrolling writes nothing to the page", async ({ page }) => {
    await openPinned(page);
    await introDone(page);
    await toHold(page, STATIONS[1]);
    await page.waitForTimeout(400);
    const mutations = await page.evaluate(async () => {
      const seen: string[] = [];
      const mo = new MutationObserver((records) => {
        for (const r of records) seen.push(`${(r.target as Element).className || r.target.nodeName} ${r.attributeName ?? r.type}`);
      });
      mo.observe(document.querySelector(".landing")!, { attributes: true, childList: true, subtree: true, characterData: true });
      for (let i = 0; i < 8; i++) {
        window.scrollBy({ top: 12, behavior: "instant" });
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      }
      mo.disconnect();
      return seen;
    });
    expect(mutations).toEqual([]);
  });

  test("beats change paint, never layout", async ({ page }) => {
    await openPinned(page);
    const heights = new Set<number>();
    for (const id of ["hero", "stack", STATIONS[3], "cap-1", "work", "build-2", "studio-contrast"]) {
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

  test("each station pulls out its own layer, its software beside it, its manifest line lit", async ({ page }) => {
    await openPinned(page);
    for (const [i, id] of STATIONS.entries()) {
      await toHold(page, id);
      await expect(page.locator(STAGE)).toHaveAttribute("data-labels", "annot");
      await expect(page.locator(`${STAGE} [data-sheet="a"] [data-poster="${id}"]`)).toHaveAttribute("data-on", "");
      const card = page.locator(`.beat--${id} .layer-card`);
      await expect(card).toHaveAttribute("data-layer", String(i));
      await expect.poll(() => card.evaluate((el) => parseFloat(getComputedStyle(el).opacity))).toBe(1);
      const lit = await page
        .locator(`.furniture--stack [data-part="${id}"]`)
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundImage);
      expect(lit, id).not.toBe("none");
    }
    await toHold(page, "locked");
    await expect.poll(() => opacity(page, ".furniture--stack .part-state")).toBe(1);
  });

  test("paper passes axe at a station", async ({ page }) => {
    await openPinned(page);
    await toHold(page, STATIONS[1]);
    const found = await seriousViolations(page, "#platform");
    expect(found, `serious/critical violations:\n${found.join("\n")}`).toEqual([]);
  });
});

test.describe("capabilities", () => {
  test("each capability turns to 12, takes its hue and builds its demo; the finale completes the set", async ({ page }) => {
    await openPinned(page);
    const stage = page.locator(STAGE);
    for (let i = 0; i < CAPABILITY_HUES.length; i++) {
      await toHold(page, `cap-${i}`);
      await expect(stage).toHaveAttribute("data-cap", String(i));
      await expect(stage).toHaveAttribute("data-accent", CAPABILITY_HUES[i]);
      await expect.poll(() => opacity(page, `${STAGE} [data-demo="${i}"]`)).toBeGreaterThan(0.9);
      await expect(page.locator(`.beat--cap-${i} .cap-detent`)).toContainText(CAPABILITY_ROUTES[i]);
      await expect(page.locator(`.beat--cap-${i} .spec-panel`)).toBeVisible();
    }
    await toHold(page, "finale");
    await expect(stage).toHaveAttribute("data-complete", "");
    await expect.poll(() => opacity(page, `${STAGE} [data-demo="wave"]`)).toBeGreaterThan(0.9);
  });

  test("every capability is in the flow", async ({ page }) => {
    await page.goto(PREVIEW);
    await expect(page.locator("#capabilities h3")).toHaveCount(CAPABILITY_HUES.length);
  });

  test("axe passes mid-chapter", async ({ page }) => {
    await openPinned(page);
    await toHold(page, "cap-1");
    const found = await seriousViolations(page, "#capabilities");
    expect(found, `serious/critical violations:\n${found.join("\n")}`).toEqual([]);
  });
});

test.describe("work, process, tools", () => {
  test("the case shows its CMS metrics and stack, and links to itself", async ({ page }) => {
    await openPinned(page);
    await toHold(page, "work");
    const metrics = await page.locator("#work-cases .metrics dd").allTextContents();
    expect(metrics.length).toBeGreaterThan(0);
    for (const m of metrics) expect(m.trim()).not.toBe("");
    await expect(page.locator("#work-cases .case-stack li").first()).toBeVisible();
    await expect(page.locator('#work-cases a[href^="/work/"]')).toBeVisible();
  });

  test("process: each step opens onto its artifact as the engine is built", async ({ page }) => {
    await openPinned(page);
    const steps = page.locator(".furniture--process:not(.furniture--twin) .step");
    for (let n = 1; n <= 4; n++) {
      await toHold(page, `build-${n}`);
      for (let k = 1; k <= 4; k++) {
        const open = steps.nth(k - 1).locator(".step-more");
        await expect.poll(() => open.evaluate((el) => parseFloat(getComputedStyle(el).opacity)), `build-${n}, step ${k}`).toBe(k === n ? 1 : 0);
      }
      await expect(steps.nth(n - 1).locator(".delivery")).toHaveAttribute("data-page", String(n - 1));
    }
  });

  test("tools: every vendor is named in text beside the elevation", async ({ page }) => {
    await openPinned(page);
    await expect(page.locator("#integrations .rack-row")).toHaveCount(INTEGRATIONS.length);
    const named = await page.locator("#integrations .rack-item").allTextContents();
    expect(named.map((t) => t.trim())).toEqual(INTEGRATIONS.flatMap((g) => g.items));
    await toHold(page, "tools");
    await expect(page.locator(STAGE)).toHaveAttribute("data-labels", "ports");
  });
});

test.describe("studio, pricing, faq, contact", () => {
  test("the founder panel shows only real people; the diff's switch moves the emphasis and the engine", async ({ page }) => {
    await openPinned(page);
    await expect(page.locator("#team")).not.toContainText("Adding soon");
    await toHold(page, "studio-founder");
    await expect(page.locator("#team .id-card h3").first()).toBeVisible();
    await toHold(page, "studio-contrast");
    const sw = page.getByRole("switch", { name: "Show how Myndstack does it" });
    // The first read flips it once, agency → Myndstack, on its own: let that finish.
    await page.waitForTimeout(1600);
    await expect(sw).toHaveAttribute("aria-checked", "true");
    await sw.click();
    await expect(sw).toHaveAttribute("aria-checked", "false");
    await expect(page.locator(".contrast")).toHaveAttribute("data-state", "agency");
    await expect(page.locator(STAGE)).toHaveAttribute("data-studio", "agency");
    await expect(page.locator(`${STAGE} [data-sheet="a"] [data-poster="studio-agency"]`)).toHaveAttribute("data-on", "");
    // Both answers stay readable either way.
    await expect(page.locator(".contrast-table td")).toHaveCount(10);
  });

  test("pricing keeps its logic; the dial follows the tier in focus", async ({ page }) => {
    await openPinned(page);
    await expect(page.locator('#pricing a[href^="/pricing/"]').first()).toBeVisible();
    await expect(page.locator('#pricing a[href="#contact"]').first()).toBeAttached();
    await expect(page.locator("#pricing select")).toHaveCount(1);
    await page.locator("#pricing .pricing-card").nth(1).scrollIntoViewIfNeeded();
    await page.locator("#pricing .pricing-card").nth(1).hover();
    await expect(page.locator(".pricing-dial")).toHaveAttribute("data-coverage", "1");
  });

  test("faq is a working accordion, and its dial points at the open question", async ({ page }) => {
    await openPinned(page);
    const buttons = page.locator("#faq .faq-q button");
    await expect(buttons.first()).toHaveAttribute("aria-expanded", "true");
    await buttons.nth(1).click();
    await expect(buttons.nth(1)).toHaveAttribute("aria-expanded", "true");
    await expect(buttons.first()).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(".faq-dial")).toHaveAttribute("data-open", "1");
  });

  test("contact: the form is server-rendered; no tabs without a Cal link", async ({ page }) => {
    await page.goto(PREVIEW);
    await expect(page.locator("#contact form")).toHaveCount(1);
    await expect(page.locator('#contact [role="tablist"]')).toHaveCount(0);
  });

  test("no element id is duplicated, and every drawing is defined once, in the cached sprite", async ({ page, request }) => {
    await page.goto(PREVIEW);
    const dupes = await page.evaluate(() => {
      const seen = new Map<string, number>();
      document.querySelectorAll("[id]").forEach((el) => seen.set(el.id, (seen.get(el.id) ?? 0) + 1));
      return [...seen].filter(([, n]) => n > 1).map(([id]) => id);
    });
    expect(dupes).toEqual([]);
    // The drawings aren't in the page: they're one static file, cached for good.
    await expect(page.locator(".landing symbol[id^='ep-']")).toHaveCount(0);
    const uses = await page.locator("use").evaluateAll((els) =>
      els.map((u) => {
        const href = u.getAttribute("href") ?? "";
        return { href, local: href.startsWith("#"), found: href.startsWith("#") && !!document.querySelector(href) };
      }),
    );
    expect(uses.filter((u) => u.local && !u.found).map((u) => u.href)).toEqual([]);
    const external = uses.filter((u) => !u.local).map((u) => u.href);
    expect([...new Set(external.map((h) => h.split("#")[0]))]).toEqual([SPRITE_URL]);
    const file = await request.get(SPRITE_URL);
    expect(file.headers()["content-type"]).toContain("image/svg+xml");
    expect(file.headers()["cache-control"]).toContain("immutable");
    const ids = new Set([...(await file.text()).matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1]));
    expect(ids.size).toBe(DRAW_POSTERS.length);
    expect(external.filter((h) => !ids.has(h.split("#")[1]))).toEqual([]);
  });
});

test.describe("chrome: ruler, title block, mobile bar", () => {
  test("the ruler follows the page, takes the skin under it, and its zones navigate + move focus", async ({ page }) => {
    await openPinned(page);
    const ruler = page.getByRole("navigation", { name: "Chapters" });
    await expect(ruler).toBeVisible();
    await toHold(page, "stack");
    await expect(ruler).toHaveAttribute("data-skin", "drafting");
    await ruler.getByRole("button", { name: "Chapter 08: Pricing" }).click();
    await expect(page.locator("#pricing")).toBeFocused();
    await expect.poll(() => page.evaluate(() => document.getElementById("pricing")!.getBoundingClientRect().top)).toBeLessThan(120);
    await expect(ruler.locator(".zr-zone[data-current]")).toHaveAttribute("data-id", "pricing");
  });

  test("the title block names the section and the stage's state, and steps aside for the sheets", async ({ page }) => {
    await openPinned(page);
    const title = page.locator(".title-block");
    await toHold(page, STATIONS[1]);
    await expect(title.locator("[data-tb-sheet]")).toHaveText("02/10");
    await expect(title.locator("[data-tb-name]")).toHaveText("Stack");
    await expect(title.locator("[data-tb-read]")).toHaveText(/Layer 02\/04/i);
    await page.evaluate(() => document.getElementById("pricing")!.scrollIntoView({ behavior: "instant", block: "center" }));
    await expect(title).toHaveAttribute("data-covered", "");
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
    await expect(page.locator(".zone-ruler")).toBeHidden();
  });
});
