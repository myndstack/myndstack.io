import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

/**
 * Shared e2e helpers for the landing redesign. (smoke.spec.ts keeps its own
 * copies until the swap, when it moves onto these.)
 */

/**
 * Finish every landing chapter — the redesign's equivalent of revealAll():
 * once-chapters land on their end state, scrubbed runs snap to the current
 * scroll position with the glide and ambient motion off, and every `.reveal`
 * (the reused live sections) is shown.
 */
export async function finishAllMotion(page: Page) {
  await page.evaluate(() => {
    const s = document.createElement("style");
    s.textContent = "*,*::before,*::after{transition:none!important;animation:none!important}";
    document.head.appendChild(s);
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-in"));
  });
  // Re-dispatch until every chapter reports done: before hydration there are
  // no registered chapters, and the event would simply be lost.
  await page.waitForFunction(
    () => {
      document.dispatchEvent(new Event("motion:finish-all"));
      return document.querySelectorAll('[data-chapter]:not([data-motion="done"])').length === 0;
    },
    undefined,
    { polling: 100 },
  );
}

/** axe serious/critical violations, as "rule → selector" strings. */
export async function seriousViolations(page: Page, include?: string): Promise<string[]> {
  let builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);
  if (include) builder = builder.include(include);
  const { violations } = await builder.analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .flatMap((v) => v.nodes.map((n) => `${v.id} → ${n.target.join(" ")}`))
    .sort();
}

/**
 * Scroll so a pinned element sits at `fraction` of its sticky run (height −
 * viewport). `target` is an id, or any selector. Instant: the site sets
 * `scroll-behavior: smooth`, and a smooth glide would still be moving while
 * the test measures.
 */
export async function scrollChapterTo(page: Page, target: string, fraction: number) {
  await page.evaluate(
    ([sel, f]) => {
      const el = (document.getElementById(sel as string) ?? document.querySelector(sel as string)) as HTMLElement;
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: top + (el.offsetHeight - window.innerHeight) * (f as number),
        behavior: "instant",
      });
    },
    [target, fraction] as const,
  );
}

/**
 * Wait until a scrubbed chapter's motion is actually built (`data-built`),
 * its intro (if any) has finished, and its glide has caught up with the scroll.
 */
export async function settled(page: Page, chapter: string) {
  await page.waitForFunction(
    (id) => {
      const root = document.querySelector(`[data-chapter="${id}"]`) as HTMLElement | null;
      if (!root || root.dataset.built !== "true") return false;
      return root.dataset.intro !== "playing" && root.dataset.glide !== "moving";
    },
    chapter,
    { polling: 50, timeout: 12_000 },
  );
  // Two frames for the last seek to land in style.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/** rotateX (deg) of a transformed element, from its computed matrix (m22/m11 = cos θ). */
export async function tiltOf(page: Page, selector: string): Promise<number> {
  return page.locator(selector).first().evaluate((el) => {
    const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
    const s = Math.hypot(m.m11, m.m12, m.m13) || 1;
    return (Math.acos(Math.max(-1, Math.min(1, m.m22 / s))) * 180) / Math.PI;
  });
}
