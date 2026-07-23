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
});
