#!/usr/bin/env node
/**
 * First-load JS budget for the landing page, measured the way a visitor pays
 * for it: every first-load chunk of the route, gzipped, summed.
 *
 * Reads Next's own per-route stats (`.next-build/diagnostics/route-bundle-
 * stats.json`, written by `npm run build`) and compares the landing route
 * against the live homepage — the redesign may cost at most BUDGET_KB more.
 * Lazy chapter chunks are deliberately NOT counted: they load near their
 * chapter, not up front.
 *
 *   npm run build && node scripts/bundle-budget.mjs [landingRoute] [baselineRoute]
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const DIST = ".next-build";
const BUDGET_KB = 10;
const [landing = "/preview", baseline = "/"] = process.argv.slice(2);

const stats = JSON.parse(readFileSync(join(DIST, "diagnostics", "route-bundle-stats.json"), "utf8"));

function gzipped(route) {
  const entry = stats.find((r) => r.route === route);
  if (!entry) throw new Error(`route ${route} not in route-bundle-stats.json`);
  return entry.firstLoadChunkPaths.reduce((sum, p) => sum + gzipSync(readFileSync(join(p))).length, 0);
}

const kb = (b) => (b / 1024).toFixed(1);
const a = gzipped(landing);
const b = gzipped(baseline);
const delta = a - b;
console.log(`${baseline.padEnd(10)} ${kb(b)} KB gz`);
console.log(`${landing.padEnd(10)} ${kb(a)} KB gz  (${delta >= 0 ? "+" : ""}${kb(delta)} KB, budget +${BUDGET_KB} KB)`);
if (delta > BUDGET_KB * 1024) {
  console.error(`✖ over budget by ${kb(delta - BUDGET_KB * 1024)} KB`);
  process.exit(1);
}
console.log("✓ within budget");
