import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Browser smoke tests.
 *
 * Every test here maps to a regression that actually shipped during development
 * and was invisible to both unit tests and screenshots — `inert` left on the
 * whole page, a non-animatable `max-width` snapping mid-morph, and the nav
 * capsule overflowing between 760 and 850px. Unit tests cover the pure reducers;
 * this file covers the things that only exist in a real browser.
 */

/** The loader covers the page for ~1.65s then fades over ~0.85s. */
const LOADER_MS = 3000;

async function landOnHome(page: Page) {
  await page.goto("/");
  await page.waitForTimeout(LOADER_MS);
}

/**
 * Scrolls in steps rather than one jump. The nav tuck and the back-to-top button
 * both key off a *sustained* travel accumulator, so a single large scrollTo does
 * not reproduce what a user does.
 */
async function scrollBySteps(page: Page, total: number, steps = 6) {
  const step = Math.round(total / steps);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, step);
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(250);
}

/**
 * Every route renders, with metadata, and is NOT the error boundary.
 *
 * This exists because a deploy once served the error page ("Something in the
 * stack gave way") on every route while the whole suite stayed green: the error
 * boundary still renders the nav and footer, so the navigation and layout tests
 * passed straight through it. The tell was that `<title>` and every meta tag had
 * vanished — metadata resolved at build time for a static page, and broke when
 * the pages were switched to render per request.
 *
 * So: assert the title exists and the error copy doesn't. Cheap, and it catches
 * a whole class of "the site is down but CI is green".
 */
test.describe("every route renders with metadata", () => {
  const ROUTES = [
    "/",
    "/careers",
    "/work",
    "/privacy",
    "/careers/staff-platform-engineer",
    "/work/aperture-health",
  ];

  for (const route of ROUTES) {
    test(`${route} has a title and is not the error page`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);

      // Metadata resolved. An empty title is the signature of the outage above.
      await expect(page).toHaveTitle(/\S/);
      await expect(page).toHaveTitle(/Myndstack/);

      // The error boundary must not be what the visitor got.
      await expect(page.locator("body")).not.toContainText("gave way");

      // Canonical proves the metadata pipeline ran, not just that a title exists.
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    });
  }
});

test.describe("page is actually usable", () => {
  test("nothing is left inert once the loader clears", async ({ page }) => {
    await landOnHome(page);

    // The regression: Loader set inert on #site and released it in an unmount
    // cleanup that never ran, because it finishes by rendering null.
    await expect(page.locator("#site")).not.toHaveAttribute("inert", /.*/);

    const cta = page.locator(".nav-cta").first();
    await expect(cta).toBeVisible();
    await cta.click();
    await expect(page).toHaveURL(/#contact$/);
  });

  test("contact form validates inline, then submits", async ({ page }) => {
    await landOnHome(page);
    await page.locator("#contact").scrollIntoViewIfNeeded();

    const form = page.locator("#contact form");
    await form.getByRole("button", { name: /send message/i }).click();
    await expect(form.locator("p[id$='-error']").first()).toBeVisible();

    await form.locator('[name="name"]').fill("Ada Lovelace");
    await form.locator('[name="email"]').fill("ada@example.com");
    await form
      .locator('[name="message"]')
      .fill("We need a unified inference layer across three regions.");
    await form.getByRole("button", { name: /send message/i }).click();

    await expect(page.getByText(/message received/i)).toBeVisible({ timeout: 15_000 });
  });

  test("the mail pipeline resolves a usable transport", async ({ request }) => {
    // Asserts `ok`, not `deliverable`. This suite runs a production build with
    // MAIL_TRANSPORT=console on purpose, so mail legitimately reaches nobody
    // here — demanding deliverability would fail every run. What this catches is
    // the wiring: a resolver that throws, a bad instrumentation import, or a
    // config the running server rejects.
    const response = await request.get("/api/health");

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true });
  });
});

test.describe("layout holds at every width", () => {
  for (const width of [320, 375, 768, 1024, 1440]) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await landOnHome(page);

      // Document-level only. A per-element sweep needs exclusions for clipped
      // ancestors, fixed positioning and the marquees, and is flaky as a result.
      const overflow = await page.evaluate(() => {
        const el = document.documentElement;
        return el.scrollWidth - el.clientWidth;
      });
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  /**
   * The loop above only ever visited the home page, so a layout that broke on,
   * say, /subprocessors or a checkout page went unseen. A full sweep (15 routes
   * × 11 widths) found the site clean, so what this guards is the regression:
   * every route at the two extremes it has to survive — 320px is the narrowest
   * phone still in use, 1280px the common desktop.
   */
  test("no route overflows horizontally at the extremes", async ({ page }) => {
    const routes = [
      "/",
      "/work",
      "/work/aperture-health",
      "/careers",
      "/careers/ml-systems-engineer",
      "/pricing/discovery-sprint",
      "/legal",
      "/privacy",
      "/terms",
      "/cookies",
      "/dpa",
      "/refunds",
      "/security",
      "/subprocessors",
      "/responsible-ai",
    ];

    const broken: string[] = [];
    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of routes) {
        await page.goto(route);
        // Not `networkidle` — the marquees and the hero canvas keep the page
        // busy, so it never settles and the wait times out. A short beat after
        // load is enough: overflow is a layout fact, not an animation one.
        await page.waitForTimeout(400);
        const overflow = await page.evaluate(() => {
          const el = document.documentElement;
          return el.scrollWidth - el.clientWidth;
        });
        if (overflow > 0) broken.push(`${route} @ ${width}px: +${overflow}px`);
      }
    }
    expect(broken, `routes overflow horizontally:\n${broken.join("\n")}`).toEqual([]);
  });

  test("nav capsule fits in the tight band without squeezing the mark", async ({
    page,
  }) => {
    // 760-850px is where six links plus the CTA barely fit inside the pill.
    //
    // Overflow alone is not enough to assert. This test passed for a long time
    // while the wordmark was being crushed to an 8px sliver: the mark was a
    // shrinkable flex item, so the row absorbed the deficit by squashing the
    // logo instead of overflowing, and the measurement saw nothing wrong. The
    // mark's width is now checked against its natural size in the same breath.
    for (const width of [775, 785, 800, 850, 900]) {
      await page.setViewportSize({ width, height: 900 });
      await landOnHome(page);
      await scrollBySteps(page, 600);

      const result = await page.evaluate(() => {
        const nav = document.querySelector(".nav");
        const inner = document.querySelector(".nav-inner");
        const mark = document.querySelector(".wm-stack");
        if (!nav || !inner || !mark) return null;

        nav.classList.remove("is-cap");
        void (nav as HTMLElement).offsetWidth;
        const natural = mark.getBoundingClientRect().width;

        nav.classList.add("is-cap");
        void (nav as HTMLElement).offsetWidth;
        return {
          natural,
          capsule: mark.getBoundingClientRect().width,
          overflowing:
            inner.scrollWidth > inner.clientWidth || nav.scrollWidth > nav.clientWidth,
        };
      });

      expect(result, "nav did not render").not.toBeNull();
      expect(result!.overflowing, `capsule overflows at ${width}px`).toBe(false);
      // Same width in both states — the mark is not what gives.
      expect(result!.capsule, `wordmark squeezed at ${width}px`).toBeCloseTo(
        result!.natural,
        1,
      );
    }
  });
});

/**
 * The bar → capsule morph, guarded by properties rather than by eye.
 *
 * It shipped stuttering twice for two different reasons, and neither is visible
 * to a screenshot: the morph animated `width`/`padding` (so every frame reflowed
 * the wordmark, six links and the CTA), and the scroll callback rewrote a class
 * and an `aria-current` on all six links on every frame whether or not anything
 * had changed. Both are cheap to assert and impossible to spot in review.
 */
test.describe("the nav morph stays cheap", () => {
  test("the morph animates no layout properties", async ({ page }) => {
    await landOnHome(page);

    const transitions = await page.evaluate(() => {
      const read = (selector: string) => {
        const el = document.querySelector(selector);
        return el ? getComputedStyle(el).transitionProperty : "";
      };
      return { nav: read(".nav"), scrim: read(".nav-scrim") };
    });

    // The nav box itself must only ever move. Anything that resizes it is back
    // to reflowing its contents 60 times a second.
    expect(transitions.nav).toBe("transform");
    expect(transitions.scrim).toBe("opacity");
  });

  test("a steady scroll does not rewrite the nav every frame", async ({ page }) => {
    await landOnHome(page);

    const mutations = await page.evaluate(async () => {
      const nav = document.querySelector(".nav");
      if (!nav) return -1;

      let count = 0;
      const observer = new MutationObserver((records) => {
        count += records.length;
      });
      observer.observe(nav, {
        attributes: true,
        subtree: true,
        attributeFilter: ["class", "aria-current"],
      });

      // 60 discrete positions through the capsule threshold and well past it,
      // each given a frame to be dispatched and written.
      for (let y = 0; y <= 1200; y += 20) {
        window.scrollTo({ top: y, behavior: "instant" });
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      }

      observer.disconnect();
      return count;
    });

    // Legitimate writes are the capsule toggling, the tuck toggling, and two
    // per change of active section — a handful over the whole scroll. Per-frame
    // churn lands in the dozens: `setAttribute` queues a mutation even when the
    // value is unchanged, so the old code wrote one record per frame per active
    // link. Generous enough not to be flaky, tight enough to fail that.
    expect(mutations).toBeGreaterThanOrEqual(0);
    expect(mutations).toBeLessThan(20);
  });
});

/**
 * StackStory's viewport pin. The section relies on `position: sticky`, and the
 * classic way to break it silently is an ancestor that scroll-clips overflow —
 * added for some unrelated reason, months later, a few components up. Nothing
 * errors; the section just scrolls straight through instead of pinning. So this
 * asserts the invariant directly: no ancestor between the sticky element and
 * <body> may be a vertical scroll container. (`overflow: clip` stays legal —
 * unlike `hidden` it creates no scroll container, which is why #site's
 * overflow-x-clip doesn't bite.)
 */
test.describe("the stack story keeps its pin", () => {
  test("no ancestor of the sticky element scroll-clips vertical overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnHome(page);
    const offenders = await page
      .locator(".story-layer")
      .first()
      .evaluate((tile) => {
        const section = tile.closest("section");
        const sticky = Array.from(section?.children ?? []).find(
          (child) => getComputedStyle(child).position === "sticky",
        );
        if (!sticky) return ["no sticky element found in the stack story"];
        const bad: string[] = [];
        for (let el = sticky.parentElement; el && el !== document.body; el = el.parentElement) {
          const overflowY = getComputedStyle(el).overflowY;
          if (overflowY === "hidden" || overflowY === "scroll" || overflowY === "auto") {
            bad.push(`${el.tagName.toLowerCase()}#${el.id}: overflow-y ${overflowY}`);
          }
        }
        return bad;
      });
    expect(offenders).toEqual([]);
  });
});

/**
 * The Hybrid A+B field (SectionField) — grid + signals + cursor spotlight — is
 * the StackStory backdrop and the page's one decorated moment; everything else
 * sits on plain ink. Easy to regress and invisible to a screenshot: the field
 * must stay clipped, its signal canvas must not run under reduced motion or on
 * mobile (only the static grid shows there), and the spotlight must engage on
 * hover only.
 */
const FIELD_COUNT = 1; // StackStory only
const SIGNAL_BANDS = 1; // StackStory

test.describe("the section fields stay in their lane", () => {
  test("every field is clipped so it can't bleed into neighbours", async ({
    page,
  }) => {
    // Each field's `overflow: hidden` wrapper stops it painting into the
    // sections above and below. (Document-level horizontal overflow is separately
    // caught by `#site`'s overflow-x-clip, so a doc-width assertion here would pass
    // even with the clip gone — this asserts the clip itself, which actually bites.)
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnHome(page);
    const fields = page.locator(".field");
    await expect(fields).toHaveCount(FIELD_COUNT);
    const overflows = await fields.evaluateAll((els) =>
      els.map((el) => getComputedStyle(el.parentElement as Element).overflow),
    );
    expect(overflows.every((o) => o === "hidden")).toBe(true);
  });

  test("runs the signal canvases on desktop but not on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnHome(page);
    await expect(page.locator(".field canvas")).toHaveCount(SIGNAL_BANDS);

    await page.setViewportSize({ width: 400, height: 900 });
    // Give the media-query store a beat to settle and drop the canvases.
    await page.waitForTimeout(200);
    await expect(page.locator(".field canvas")).toHaveCount(0);
    // The static fields themselves are always present.
    await expect(page.locator(".field .field-grid")).toHaveCount(FIELD_COUNT);
  });

  test("drops the canvases under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnHome(page);
    await expect(page.locator(".field canvas")).toHaveCount(0);
    await expect(page.locator(".field .field-grid")).toHaveCount(FIELD_COUNT);
  });

  test("the cursor spotlight engages under the pointer, and only there", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnHome(page);
    const field = page.locator(".field").first();
    // Nothing hovered yet — the hot layer must be off.
    await expect(field).not.toHaveClass(/is-hot/);

    const heading = page.getByRole("heading", { name: /one stack/i });
    await heading.scrollIntoViewIfNeeded();
    const box = (await heading.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(field).toHaveClass(/is-hot/);
    // The pointer position lands as CSS custom properties on the field, in px.
    const fx = await field.evaluate((el) => el.style.getPropertyValue("--fx"));
    expect(fx).toMatch(/px$/);

    // Leaving the section (here: onto the fixed nav) releases the spotlight.
    await page.mouse.move(box.x + box.width / 2, 10);
    await expect(field).not.toHaveClass(/is-hot/);
  });

  test("the spotlight never engages under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnHome(page);
    const heading = page.getByRole("heading", { name: /one stack/i });
    await heading.scrollIntoViewIfNeeded();
    const box = (await heading.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    // Give a wrongly-bound handler time to fire before asserting silence.
    await page.waitForTimeout(150);
    await expect(page.locator(".field").first()).not.toHaveClass(/is-hot/);
  });
});

/**
 * UI/UX audit fixes — each maps to a WCAG success criterion and would silently
 * regress (they're invisible to the existing tests).
 */
test.describe("touch targets and error affordances", () => {
  test("interactive controls meet the target-size minimum (WCAG 2.5.8)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await landOnHome(page);

    // Footer social links are the only path to socials below 1100px → 44×44.
    // The row is `lg:hidden` (above 1100px the desktop spine carries the same
    // profiles), so measure at a sub-lg width where the links actually render —
    // at 1280px this locator resolves to a display:none element and times out.
    await page.setViewportSize({ width: 1000, height: 900 });
    const social = page.locator('footer a[rel="noopener noreferrer"]').first();
    await social.scrollIntoViewIfNeeded();
    const socialBox = await social.boundingBox();
    expect(socialBox!.width, "footer social width").toBeGreaterThanOrEqual(44);
    expect(socialBox!.height, "footer social height").toBeGreaterThanOrEqual(44);

    // Mobile drawer close. Back to the top first — scrolling to the footer above
    // tucked the nav (and its burger) away.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: /open menu/i }).click();
    const close = page.getByRole("button", { name: /close menu/i });
    const closeBox = await close.boundingBox();
    expect(closeBox!.width, "drawer close width").toBeGreaterThanOrEqual(44);
    expect(closeBox!.height, "drawer close height").toBeGreaterThanOrEqual(44);
  });

  /**
   * The four targets a full-site sweep caught under the 24px WCAG 2.5.8 floor.
   * The test above checks the controls someone thought about; these are the ones
   * that were missed because they are text links, and text links are where the
   * floor is easiest to fall through — a 12.5px legal link is 20px tall, and a
   * 16px social glyph is 16px square.
   *
   * Each is fixed with padding that costs no layout (a negative-margin pair on
   * flex items, plain padding on inline ones), so a future "tidy up the
   * spacing" is exactly what would silently undo it.
   */
  test("text links and icon links clear the 24px target floor", async ({ page }) => {
    const atLeast24 = async (locator: ReturnType<Page["locator"]>, what: string) => {
      const box = await locator.boundingBox();
      expect(box, `${what} did not render`).not.toBeNull();
      expect(box!.height, `${what} height`).toBeGreaterThanOrEqual(24);
      expect(box!.width, `${what} width`).toBeGreaterThanOrEqual(24);
    };

    // Footer legal row — present at every width, so check the narrowest.
    await page.setViewportSize({ width: 320, height: 900 });
    await landOnHome(page);
    const legal = page.locator('nav[aria-label="Legal"] a').first();
    await legal.scrollIntoViewIfNeeded();
    await atLeast24(legal, "footer legal link");

    // Contact email + phone on /#contact.
    await atLeast24(page.locator('a[href^="mailto:"]').first(), "contact email");
    await atLeast24(page.locator('a[href^="tel:"]').first(), "contact phone");

    // Drawer email — only interactive while the drawer is open (it is `inert`
    // otherwise), and the drawer is the only nav a phone gets.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: /open menu/i }).click();
    await page.waitForTimeout(400);
    await atLeast24(
      page.locator('#mobile-drawer a[href^="mailto:"]'),
      "drawer email",
    );

    // Desktop spine socials. Above 1100px the footer social row is `lg:hidden`,
    // so the spine is the ONLY route to these profiles.
    await page.setViewportSize({ width: 1280, height: 900 });
    await landOnHome(page);
    await atLeast24(page.locator(".spine-social").first(), "spine social link");
  });

  test("field validation errors use the danger colour, not white", async ({ page }) => {
    await landOnHome(page);
    await page.locator("#contact").scrollIntoViewIfNeeded();
    const form = page.locator("#contact form");
    await form.getByRole("button", { name: /send message/i }).click();
    const err = form.locator("p[id$='-error']").first();
    await expect(err).toBeVisible();
    // --color-danger #ff7a6b → rgb(255, 122, 107). The bug rendered it white
    // (rgb(255,255,255)) because `text-red` isn't a real utility.
    const color = await err.evaluate((el) => getComputedStyle(el).color);
    expect(color).toBe("rgb(255, 122, 107)");
  });

  test("reduced motion assembles the stack with no scroll animation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1280, height: 900 });
    await landOnHome(page);
    // Without scrolling into the pinned section, the tiles are already assembled
    // (opacity 1, locked). Under normal motion they'd be at opacity 0 up here.
    const tiles = page.locator(".story-layer");
    await expect(tiles).toHaveCount(4);
    const opacities = await tiles.evaluateAll((els) =>
      els.map((el) => getComputedStyle(el).opacity),
    );
    expect(opacities.every((o) => o === "1"), `opacities: ${opacities}`).toBe(true);
    await expect(tiles.first()).toHaveClass(/is-locked/);
  });
});

/**
 * Standing accessibility guard (axe-core).
 *
 * A Vercel audit surfaced a wall of `color-contrast` and `link-in-text-block`
 * violations — chiefly the manifesto rendering its un-lit words below AA, plus
 * lime links marked by colour alone. This encodes the fix the way the metadata
 * and nav regressions are encoded: a test that fails loudly if any of it returns.
 *
 * Gated on `serious` + `critical` only. The `region` best-practice rule (the
 * skip link, the scroll rail) is handled separately and is borderline by nature;
 * coupling this to it would make it flake the first time a new decorative element
 * appears. Serious+critical is the meaningful, stable line.
 */
const A11Y_ROUTES = ["/", "/careers", "/work", "/privacy"];
const A11Y_VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

/**
 * Put every scroll-triggered section into its true revealed REST state before
 * auditing. Most sections are `.reveal` (opacity:0 until in view) and axe skips
 * zero-opacity elements, so a top-only scan misses most of the page.
 *
 * The subtlety that matters: force `opacity:1` alone and you *start* the 0.7s
 * reveal transition (with per-item stagger) — axe then samples half-faded text
 * and misreads `.is-in`-dependent card backgrounds, inventing dozens of contrast
 * failures that don't exist at rest. Instead add the real `.is-in` class (so the
 * genuine revealed styles apply) and kill transitions/animations so nothing is
 * caught mid-flight. This is the state a user sees after scrolling.
 */
async function revealAll(page: Page) {
  await page.evaluate(() => {
    const s = document.createElement("style");
    s.textContent = "*,*::before,*::after{transition:none!important;animation:none!important}";
    document.head.appendChild(s);
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-in"));
  });
  await page.waitForTimeout(150);
}

async function seriousViolations(page: Page): Promise<string[]> {
  const scan = async () => {
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    return violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .flatMap((v) => v.nodes.map((n) => `${v.id} → ${n.target.join(" ")}`));
  };

  // Scan first as-loaded (catches the manifesto in its un-lit state, which the
  // reveal would otherwise brighten away), then again once everything is in view.
  const found = new Set<string>(await scan());
  await revealAll(page);
  for (const f of await scan()) found.add(f);
  return [...found].sort();
}

test.describe("no serious accessibility violations", () => {
  for (const vp of A11Y_VIEWPORTS) {
    for (const route of A11Y_ROUTES) {
      test(`${route} @ ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(route);
        await page.waitForTimeout(LOADER_MS);
        const found = await seriousViolations(page);
        expect(found, `serious/critical violations:\n${found.join("\n")}`).toEqual([]);
      });
    }
  }
});

test.describe("navigation reaches everything", () => {
  test("work cards open their case study", async ({ page }) => {
    await landOnHome(page);

    const card = page.locator('a[href^="/work/"]').first();
    const href = await card.getAttribute("href");
    await card.click();

    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByRole("heading", { name: /the challenge/i })).toBeVisible();
  });

  test("work index lists every case and each one opens", async ({ page }) => {
    await page.goto("/work");
    const cards = page.locator('a[href^="/work/"]');
    await expect(cards).toHaveCount(4);

    await cards.first().click();
    await expect(page).toHaveURL(/\/work\/[a-z-]+$/);
  });

  test("role cards open their listing", async ({ page }) => {
    await page.goto("/careers");
    const role = page.locator('a[href^="/careers/"]').first();
    await role.click();
    await expect(page).toHaveURL(/\/careers\/[a-z-]+$/);
    await expect(page.getByRole("heading", { name: /about the role/i })).toBeVisible();
  });

  test("nav Customers marks itself current and drops stale scroll-spy state", async ({
    page,
  }) => {
    await landOnHome(page);
    await scrollBySteps(page, 3000);
    // The capsule tucks itself away on sustained downward scroll, so come back up
    // to reveal it — which is what someone reaching for the nav would do anyway.
    await scrollBySteps(page, -300, 4);

    // Customers is a route link (/work) that also spies the homepage case-studies
    // section; on /work its active state must come from the URL, and the stale
    // homepage scroll-spy highlight must clear — exactly one link stays current.
    await page.locator('.navlink[href="/work"]').click();
    await expect(page).toHaveURL(/\/work$/);

    // Web-first assertion so this settles the post-navigation active-state race
    // rather than snapshotting once (the suite runs with retries: 0 locally):
    // exactly one link stays current, and it's Customers — its URL-based active
    // state, with the stale homepage scroll-spy highlight cleared.
    await expect(page.locator(".navlink.is-active")).toHaveText(["Customers"]);
  });
});

test.describe("scroll chrome", () => {
  test("back-to-top appears only when heading back up", async ({ page }) => {
    await landOnHome(page);
    const button = page.locator(".totop");

    await scrollBySteps(page, 2500);
    await expect(button).not.toHaveClass(/is-visible/);

    await scrollBySteps(page, -400, 4);
    await expect(button).toHaveClass(/is-visible/);
  });

  /**
   * The spy reads cached `offsetTop` values rather than measuring rects every
   * frame. Everything that can go wrong with a cache goes wrong here — a stale
   * entry, a measurement taken before fonts swapped — and none of it is visible
   * to the unit tests, which only exercise the arithmetic.
   */
  test("scroll-spy follows the page down through its sections", async ({ page }) => {
    await landOnHome(page);

    const current = () =>
      page.evaluate(
        () =>
          document
            .querySelector(".navlink[data-section].is-active")
            ?.getAttribute("data-section") ?? null,
      );

    // Nothing is highlighted over the hero / intro (no first-in-document fallback).
    expect(await current()).toBe(null);

    // Land just past each landmark's top, in document order, without jumping back.
    for (const section of ["platform", "work-grid", "work-cases", "pricing", "team"]) {
      const target = await page.evaluate(
        (id) => document.getElementById(id)!.offsetTop + 40,
        section,
      );
      await scrollBySteps(page, target - (await page.evaluate(() => window.scrollY)));
      expect(await current()).toBe(section);
    }

    // Past the tail sentinel (#manifesto) the highlight clears — the closing
    // sections (manifesto / FAQ / CTA / contact) are owned by no nav item.
    const tail = await page.evaluate(
      () => document.getElementById("manifesto")!.offsetTop + 40,
    );
    await scrollBySteps(page, tail - (await page.evaluate(() => window.scrollY)));
    expect(await current()).toBe(null);
  });

  /**
   * Anchor jumps must land flush: with a transparent nav, a click that leaves the
   * previous section peeking in behind the bar looks broken — most visibly the
   * green CTA band bleeding in above the Contact form. scroll-padding-top: 0 plus
   * each section's own top padding lands the target at the very top with content
   * below the nav, and the previous section fully off screen.
   */
  test("clicking an anchor lands the section flush, no previous section bleeding in", async ({
    page,
  }) => {
    await landOnHome(page);
    await page.locator(".nav-cta").click();
    await expect(page).toHaveURL(/#contact$/);

    // Wait for the smooth scroll to settle: Contact's box flush at the top and the
    // green CTA band that precedes it entirely above the fold.
    await page.waitForFunction(
      () => {
        const contact = document.getElementById("contact");
        const cta = document.getElementById("cta");
        if (!contact || !cta) return false;
        return (
          contact.getBoundingClientRect().top <= 2 &&
          cta.getBoundingClientRect().bottom <= 2
        );
      },
      undefined,
      { timeout: 4000 },
    );
  });

  /**
   * Nothing about a paused marquee is visible, which is exactly why it needs a
   * test: the observer could stop firing and the only symptom would be a phone
   * getting warm.
   */
  test("marquees stop animating once they are off screen", async ({ page }) => {
    await landOnHome(page);

    const playState = () =>
      page.evaluate(
        () =>
          getComputedStyle(document.querySelector(".animate-marq")!).animationPlayState,
      );

    // It sits below the full-height hero, so it starts off screen and paused.
    expect(await playState()).toBe("paused");

    const band = await page.evaluate(
      () => document.querySelector(".animate-marq")!.getBoundingClientRect().top,
    );
    await scrollBySteps(page, Math.round(band - 200));
    expect(await playState()).toBe("running");

    await scrollBySteps(page, 3000);
    expect(await playState()).toBe("paused");
  });
});

test.describe("the intro plays once per session", () => {
  test("first load shows it, a reload in the same session does not", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(".loader")).toBeVisible();

    await page.waitForTimeout(LOADER_MS);
    await expect(page.locator(".loader")).toHaveCount(0);

    // Same tab, same session: the entrance is spent.
    await page.reload();
    await expect(page.locator(".loader")).toHaveCount(0);

    // The overlay is what `inert` exists to cover. No overlay, no inert — this
    // is the same regression as "nothing is left inert", reached the other way.
    await expect(page.locator("#site")).not.toHaveAttribute("inert", /.*/);
    await expect(page.locator(".nav-cta").first()).toBeVisible();
    await page.locator(".nav-cta").first().click();
    await expect(page).toHaveURL(/#contact$/);
  });

  test("a fresh session gets the entrance again", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/");
    await expect(page.locator(".loader")).toBeVisible();

    await context.close();
  });
});
