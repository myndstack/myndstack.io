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

  test("nav capsule does not overflow in the tight band", async ({ page }) => {
    // 760-850px is where six links plus the CTA barely fit inside the pill.
    for (const width of [775, 800, 850, 900]) {
      await page.setViewportSize({ width, height: 900 });
      await landOnHome(page);
      await scrollBySteps(page, 600);

      const overflowing = await page.evaluate(() => {
        const nav = document.querySelector(".nav");
        const inner = document.querySelector(".nav-inner");
        if (!nav || !inner) return false;
        nav.classList.add("is-cap");
        return inner.scrollWidth > inner.clientWidth || nav.scrollWidth > nav.clientWidth;
      });
      expect(overflowing, `capsule overflows at ${width}px`).toBe(false);
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

  test("nav Work marks itself current and drops stale scroll-spy state", async ({
    page,
  }) => {
    await landOnHome(page);
    await scrollBySteps(page, 3000);
    // The capsule tucks itself away on sustained downward scroll, so come back up
    // to reveal it — which is what someone reaching for the nav would do anyway.
    await scrollBySteps(page, -300, 4);

    await page.locator('.navlink[href="/work"]').click();
    await expect(page).toHaveURL(/\/work$/);

    const active = await page.evaluate(() =>
      [...document.querySelectorAll(".navlink.is-active")].map((a) => a.textContent),
    );
    expect(active).toEqual(["Work"]);
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

    expect(await current()).toBe("work-grid");

    // Land just past each section's top, in order, without ever jumping back.
    for (const section of ["process", "pricing", "team"]) {
      const target = await page.evaluate(
        (id) => document.getElementById(id)!.offsetTop + 40,
        section,
      );
      await scrollBySteps(page, target - (await page.evaluate(() => window.scrollY)));
      expect(await current()).toBe(section);
    }
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
