"use client";

import { useEffect } from "react";
import { LEGAL_LINKS, NAV_LINKS } from "@/lib/content";

/**
 * Injects a Speculation Rules `prefetch` list for the site's real same-origin
 * routes so a navigation feels instant in supporting browsers.
 *
 * Notes / deliberate scope:
 * - This COMPLEMENTS Next's built-in `<Link>` prefetch, it doesn't replace it.
 * - `prefetch` only (no `prerender`): App Router client `<Link>` nav doesn't
 *   perform a document navigation, so a background full-document prerender would
 *   mostly be wasted work. Prefetch is the conservative, useful tier here.
 * - Gated behind data-saver / prefers-reduced-data — speculation costs
 *   bandwidth, so constrained clients opt out entirely.
 * - Rendered client-side because the gate (navigator.connection.saveData) can't
 *   be read on the server. Unsupported browsers simply ignore the script.
 */
export default function SpeculationRules() {
  useEffect(() => {
    const conn = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    if (conn?.saveData) return;
    if (window.matchMedia("(prefers-reduced-data: reduce)").matches) return;
    // Feature-detect; if unsupported, don't inject a script the browser ignores.
    if (
      typeof HTMLScriptElement !== "undefined" &&
      typeof HTMLScriptElement.supports === "function" &&
      !HTMLScriptElement.supports("speculationrules")
    ) {
      return;
    }

    // Real document routes only — drop in-page hash links (they aren't routes).
    const urls = Array.from(
      new Set([
        ...NAV_LINKS.map((l) => l.href),
        ...LEGAL_LINKS.map((l) => l.href),
        "/work",
        "/careers",
      ]),
    ).filter((href) => href.startsWith("/") && !href.includes("#"));

    const script = document.createElement("script");
    script.type = "speculationrules";
    script.textContent = JSON.stringify({
      prefetch: [{ source: "list", urls, eagerness: "moderate" }],
    });
    document.head.appendChild(script);
    return () => script.remove();
  }, []);

  return null;
}
