#!/usr/bin/env node
/**
 * JS budgets for the landing page, measured the way a visitor pays for them:
 * chunks gzipped and summed. Reads Next's own build output (`npm run build`
 * writes `.next-build`).
 *
 * 1. First load. Every first-load chunk of the landing route vs the live
 *    homepage — the redesign may cost at most FIRST_LOAD_KB more. Lazy chunks
 *    are deliberately not counted: they load near their chapter, not up front.
 *
 * 2. The engine chunk. three.js may only ever live in the engine's one lazy
 *    group (lib/landing/engine/gl/*). The group is found by the marker the
 *    engine entry evaluates (`performance.mark("engine:module-eval")`), and
 *    rebuilt from Turbopack's loader arrays (`Promise.all(["static/chunks/…"])`).
 *    Fails when: the marker matches no chunk (so the check can't pass
 *    vacuously), three.js appears in more than one chunk or in any route's
 *    first load, or the group is over ENGINE_KB.
 *
 *   npm run build && node scripts/bundle-budget.mjs [landingRoute] [baselineRoute]
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const DIST = ".next-build";
const FIRST_LOAD_KB = 10;
const ENGINE_KB = 150;
const ENGINE_WARN_KB = 140;
const ENGINE_MARKER = "engine:module-eval";
const THREE_SIGNATURE = "__THREE__";
const [landing = "/preview", baseline = "/"] = process.argv.slice(2);

const stats = JSON.parse(readFileSync(join(DIST, "diagnostics", "route-bundle-stats.json"), "utf8"));
const kb = (b) => (b / 1024).toFixed(1);
const gzCache = new Map();
const gz = (path) => {
  if (!gzCache.has(path)) gzCache.set(path, gzipSync(readFileSync(path)).length);
  return gzCache.get(path);
};
let failed = false;
const fail = (message) => {
  console.error(`✖ ${message}`);
  failed = true;
};

// ---- 1. First load -------------------------------------------------------
function firstLoad(route) {
  const entry = stats.find((r) => r.route === route);
  if (!entry) throw new Error(`route ${route} not in route-bundle-stats.json`);
  return entry.firstLoadChunkPaths;
}
const sum = (paths) => paths.reduce((total, p) => total + gz(p), 0);
const a = sum(firstLoad(landing));
const b = sum(firstLoad(baseline));
const delta = a - b;
console.log(`${baseline.padEnd(10)} ${kb(b)} KB gz first load`);
console.log(
  `${landing.padEnd(10)} ${kb(a)} KB gz first load  (${delta >= 0 ? "+" : ""}${kb(delta)} KB, budget +${FIRST_LOAD_KB} KB)`,
);
if (delta > FIRST_LOAD_KB * 1024) fail(`first load over budget by ${kb(delta - FIRST_LOAD_KB * 1024)} KB`);

// ---- 2. Engine chunk -----------------------------------------------------
const CHUNKS = join(DIST, "static", "chunks");
const files = readdirSync(CHUNKS, { recursive: true })
  .filter((f) => String(f).endsWith(".js"))
  .map((f) => join(CHUNKS, String(f)));
const source = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));
const withText = (text) => files.filter((f) => source.get(f).includes(text));

const markerChunks = withText(ENGINE_MARKER);
const threeChunks = withText(THREE_SIGNATURE);
const allFirstLoad = new Set(stats.flatMap((r) => r.firstLoadChunkPaths.map((p) => join(p))));

if (markerChunks.length !== 1) fail(`engine marker "${ENGINE_MARKER}" found in ${markerChunks.length} chunks (want 1)`);
if (threeChunks.length !== 1) fail(`three.js found in ${threeChunks.length} chunks (want exactly 1)`);
for (const f of [...markerChunks, ...threeChunks]) {
  if (allFirstLoad.has(f)) fail(`${f} is first-load JS — three.js / the engine must stay lazy`);
}

// Lazy groups as Turbopack emits them: Promise.all(["static/chunks/a.js", ...]).
const groups = [];
for (const text of source.values()) {
  for (const match of text.matchAll(/Promise\.all\(\[((?:"static\/chunks\/[^"]+",?)+)\]/g)) {
    groups.push([...match[1].matchAll(/"(static\/chunks\/[^"]+)"/g)].map((m) => join(DIST, m[1])));
  }
}
if (markerChunks.length === 1) {
  const marker = markerChunks[0];
  const engineGroups = groups.filter((g) => g.includes(marker));
  if (!engineGroups.length) fail("no lazy loader references the engine chunk");
  // Every chunk a visitor fetches to run the engine: the largest group that
  // loads it, plus the three.js chunk if Turbopack ever splits it out.
  const group = new Set([...(engineGroups.sort((x, y) => sum(y) - sum(x))[0] ?? [marker]), ...threeChunks]);
  const size = sum([...group]);
  console.log(`engine     ${kb(size)} KB gz lazy (${group.size} chunk${group.size === 1 ? "" : "s"}, budget ${ENGINE_KB} KB)`);
  if (size > ENGINE_KB * 1024) fail(`engine chunk over budget by ${kb(size - ENGINE_KB * 1024)} KB`);
  else if (size > ENGINE_WARN_KB * 1024) console.warn(`⚠ engine chunk within ${kb(ENGINE_KB * 1024 - size)} KB of its budget`);
}

if (failed) process.exit(1);
console.log("✓ within budget");
