#!/usr/bin/env node
/**
 * The review prototype: the real /preview as one self-contained HTML file.
 *
 * Not a mock-up — a snapshot of the production build: the server-rendered
 * HTML Next wrote for /preview (real copy from Sanity), the real compiled CSS
 * (fonts inlined), and one script bundled from the real modules — the
 * director, the WebGL renderer (three.js included), the overlay timelines —
 * plus DOM stand-ins for the few React widgets (prototype/src/shims.ts),
 * since nothing hydrates here, and the review kit (prototype/src/kit.ts).
 * Forms and checkout are inert.
 *
 *   npm run build && node scripts/prototype.mjs   →   prototype/dist/landing-v4.html
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { gzipSync } from "node:zlib";

import { build } from "esbuild";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const DIST = join(ROOT, ".next-build");
const PAGE = join(DIST, "server", "app", "preview.html");
const OUT = join(ROOT, "prototype", "dist", "landing-v4.html");

if (!existsSync(PAGE)) {
  console.error("✖ .next-build/server/app/preview.html is missing — run `npm run build` first.");
  process.exit(1);
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
const dataUri = (file, type) => `data:${type};base64,${readFileSync(file).toString("base64")}`;
let html = readFileSync(PAGE, "utf8");

// 1. Next's runtime and hydration payload go; the pre-paint flags come back as one script.
const flag = /<script>try\{if\(!matchMedia\('\(prefers-reduced-motion: reduce\)'\)[\s\S]*?<\/script>/.exec(html)?.[0] ?? "";
html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, (tag) => (tag.includes('type="application/ld+json"') ? tag : ""));
html = html.replace("</head>", () => `${flag}<script>document.documentElement.dataset.seen='1'</script></head>`);

// 2. Stylesheets inline, with their fonts as data URIs.
html = html.replace(/<link rel="stylesheet" href="\/_next\/(static\/[^"]+\.css)"[^>]*\/?>/g, (_, path) => {
  const file = join(DIST, path);
  const css = readFileSync(file, "utf8").replace(/url\((\.\.\/media\/[^)]+\.woff2)\)/g, (m, rel) => `url(${dataUri(join(dirname(file), rel), "font/woff2")})`);
  return `<style>${css}</style>`;
});

// 3. Preloads, manifest and icons pointed at the app server go; images inline.
html = html.replace(/<link rel="(?:preload|modulepreload|manifest|apple-touch-icon|canonical)"[^>]*\/?>/g, "");
html = html.replace(/<link rel="preload" as="[^"]+"[^>]*\/?>/g, "");
html = html.replace(/<link rel="icon" href="\/([^"]+)"[^>]*\/?>/, (_, f) => `<link rel="icon" href="${dataUri(join(ROOT, "public", f), "image/svg+xml")}"/>`);
html = html.replace(/(src|href)="\/(myndstack-[a-z-]+\.svg)"/g, (_, attr, f) => `${attr}="${dataUri(join(ROOT, "public", f), "image/svg+xml")}"`);

// 4. The drawings' sprite is a static file on the site; here it goes inline, and the
//    <use>s point into the page.
const SPRITE = join(DIST, "server", "app", "engine", "posters.svg.body");
const sprite = readFileSync(SPRITE, "utf8").replace("<svg ", '<svg class="engine-sprite" width="0" height="0" aria-hidden="true" ');
html = html.replace(/href="\/engine\/posters\.svg\?v=[0-9a-z]+#/g, 'href="#');
html = html.replace(/<body([^>]*)>/, (tag) => `${tag}${sprite}`);

// 5. Prototype-only styles: USD only (the currency picker needs the app's API).
html = html.replace("</head>", () => `<style>.sheet--pricing .pricing-body>div.mb-5:first-child{display:none}</style></head>`);

// 6. The script: the real modules, one bundle.
const bundle = await build({
  entryPoints: [join(ROOT, "prototype", "src", "entry.ts")],
  bundle: true,
  minify: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  write: false,
  alias: { "@": ROOT },
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "error",
});
const js = bundle.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

// 7. The artifact host supplies the document skeleton: emit the page's content
//    only — a title, the root and body classes (next/font's font variables live
//    on <html>), the styles, the body's markup, then the script.
const rootClass = /<html[^>]*\bclass="([^"]*)"/.exec(html)?.[1] ?? "";
const bodyClass = /<body[^>]*\bclass="([^"]*)"/.exec(html)?.[1] ?? "";
const head = html.slice(html.indexOf("<head>") + 6, html.indexOf("</head>"));
const styles = (head.match(/<style>[\s\S]*?<\/style>/g) ?? []).join("");
const inlineScripts = (head.match(/<script>[\s\S]*?<\/script>/g) ?? []).join("");
const body = html.slice(html.indexOf(">", html.indexOf("<body")) + 1, html.lastIndexOf("</body>"));
const page = [
  // The host's skeleton declares UTF-8 too; this keeps the file right when opened on its own.
  '<meta charset="utf-8">',
  "<title>Myndstack Engine v4</title>",
  `<script>document.documentElement.className+=${JSON.stringify(" " + rootClass)};if(document.body)document.body.className+=${JSON.stringify(" " + bodyClass)}</script>`,
  inlineScripts,
  styles,
  body,
  `<script>${js}</script>`,
].join("\n");

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, page);
console.log(`✓ ${OUT.replace(ROOT + "/", "")}  ${kb(page.length)} (${kb(gzipSync(page).length)} gz) — script ${kb(js.length)}`);
