import { expect, test } from "@playwright/test";

/**
 * P0 spike: the engine's lazy chunk loads, renders through WebGL2 (SwiftShader
 * in CI) and keeps its context when the canvas moves to another host — the
 * hosting model (one canvas, re-hosted between the stage and the docks)
 * depends on that.
 */
test("the engine chunk renders under WebGL2 and survives moving the canvas", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/preview?engine=spike");
  await expect(page.locator("html")).toHaveAttribute("data-engine-spike", "live", { timeout: 30_000 });

  const before = await page.evaluate(() => window.__engineSpike!.stats());
  expect(before).toMatchObject({ webgl2: true, lost: false, frames: 1 });
  expect(before.calls).toBeGreaterThan(0);
  await expect(page.locator('[data-spike-host="right"] canvas')).toHaveCount(1);

  await page.evaluate(() => window.__engineSpike!.rehost());
  await expect(page.locator('[data-spike-host="left"] canvas')).toHaveCount(1);
  await expect(page.locator('[data-spike-host="right"] canvas')).toHaveCount(0);
  const after = await page.evaluate(() => window.__engineSpike!.stats());
  expect(after).toMatchObject({ webgl2: true, lost: false, frames: 2 });
  expect(after.calls).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test("without the flag the engine module never evaluates", async ({ page }) => {
  await page.goto("/preview");
  await page.waitForLoadState("load");
  // Positive precondition: this is the landing, fully loaded.
  await expect(page.locator("h1")).toHaveCount(1);
  expect(await page.evaluate(() => performance.getEntriesByName("engine:module-eval").length)).toBe(0);
  await expect(page.locator("[data-spike-host]")).toHaveCount(0);
});
