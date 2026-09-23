import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

/**
 * Shared e2e helpers for the landing redesign. (smoke.spec.ts keeps its own
 * copies until the swap, when it moves onto these.)
 */

/** Finish every landing chapter — the redesign's equivalent of revealAll(). */
export async function finishAllMotion(page: Page) {
  await page.evaluate(() => {
    const s = document.createElement("style");
    s.textContent = "*,*::before,*::after{transition:none!important;animation:none!important}";
    document.head.appendChild(s);
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
export async function seriousViolations(page: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .flatMap((v) => v.nodes.map((n) => `${v.id} → ${n.target.join(" ")}`))
    .sort();
}

/**
 * Scroll so a pinned chapter sits at `fraction` of its sticky run. Instant:
 * the site sets `scroll-behavior: smooth`, and a smooth glide would still be
 * moving (and correctly re-seeking the chapter) while the test measures.
 */
export async function scrollChapterTo(page: Page, id: string, fraction: number) {
  await page.evaluate(
    ([sectionId, f]) => {
      const el = document.getElementById(sectionId as string)!;
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: top + (el.offsetHeight - window.innerHeight) * (f as number),
        behavior: "instant",
      });
    },
    [id, fraction] as const,
  );
  // One scroll frame plus a margin for the seek.
  await page.waitForTimeout(250);
}
