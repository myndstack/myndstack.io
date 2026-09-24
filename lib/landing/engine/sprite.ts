/**
 * The drawings' sprite: every technical drawing as a <symbol> in one static
 * SVG file (app/engine/posters.svg/route.ts), placed on the page with <use>.
 * It stays out of the page's HTML — and out of its RSC payload, which would
 * carry it a second time — and is cached for good: its URL is versioned by
 * its own content.
 *
 * Inside a symbol nothing relies on document selectors (a <use>'s shadow
 * tree doesn't see them): lines are currentColor, fills and hues are custom
 * properties the <use> inherits, and every path keeps its line weight in
 * screen pixels at any poster size.
 */
import type { PathKind, PosterPath } from "./drawing";
import { DRAW_POSTERS, drawingOf, type DrawPoster } from "./posters";

type Attrs = { readonly [name: string]: string | number };

/** On the symbol itself (fill, stroke and its width inherit); outlines need nothing more. */
const SYMBOL = 'fill="none" stroke="currentColor" stroke-width="1.4"';
const BASE: Attrs = { "vector-effect": "non-scaling-stroke" };
const KIND: Record<PathKind, Attrs> = {
  body: { stroke: "none" },
  outline: {},
  hidden: { "stroke-width": 1, "stroke-dasharray": "4 3", opacity: 0.4 },
  centre: { "stroke-width": 1, "stroke-dasharray": "16 4 2 4", opacity: 0.5 },
  bore: { "stroke-width": 1, opacity: 0.65 },
  inlay: { "stroke-width": 2.4 },
  arc: { "stroke-width": 3.2, "stroke-linecap": "round" },
  shaft: { "stroke-width": 1 },
  dim: { "stroke-width": 0.8, opacity: 0.65 },
  port: { "stroke-width": 1.5 },
};
/** Modules other than a station's focus. */
const GHOST = 0.28;

function attrs(path: PosterPath, poster: DrawPoster): Record<string, string> {
  const a: Record<string, string | number> = { ...BASE, ...KIND[path.kind] };
  const style: string[] = [];
  if (path.kind === "body" || path.kind === "port") style.push("fill:var(--ep-body)");
  if (path.kind === "body") a["fill-opacity"] = 0.9;
  if (path.hue !== undefined) {
    if (poster.sketch) a.opacity = 0.6;
    else style.push(`stroke:var(--ep-h${path.hue})`);
    if (path.kind === "arc" && !poster.powered) a.opacity = 0.22;
  }
  if (poster.focus !== undefined && path.module >= 0 && path.module !== poster.focus) {
    a.opacity = Math.round((typeof a.opacity === "number" ? a.opacity : 1) * GHOST * 1000) / 1000;
  }
  if (style.length) a.style = style.join(";");
  return Object.fromEntries(Object.entries(a).map(([k, v]) => [k, String(v)]));
}

/**
 * A drawing's paths, ready to write: consecutive paths drawn alike become one
 * path (painter's order is kept — only neighbours merge), so the file stays small.
 */
export function symbolPaths(poster: DrawPoster): { readonly d: string; readonly attrs: Readonly<Record<string, string>> }[] {
  const out: { d: string; attrs: Record<string, string>; key: string }[] = [];
  for (const path of drawingOf(poster).paths) {
    const a = attrs(path, poster);
    const key = JSON.stringify(a);
    const last = out[out.length - 1];
    if (last && last.key === key) last.d += path.d;
    else out.push({ d: path.d, attrs: a, key });
  }
  return out.map(({ d, attrs: a }) => ({ d, attrs: a }));
}

const write = (a: Readonly<Record<string, string>>) =>
  Object.entries(a)
    .map(([k, v]) => ` ${k}="${v}"`)
    .join("");

let cached: string | null = null;

/** The whole sprite file. */
export function spriteSvg(): string {
  cached ??= [
    '<svg xmlns="http://www.w3.org/2000/svg">',
    ...DRAW_POSTERS.map(
      (poster) =>
        `<symbol id="ep-${poster.id}" viewBox="${drawingOf(poster).viewBox.join(" ")}" ${SYMBOL}>${symbolPaths(poster)
          .map((p) => `<path d="${p.d}"${write(p.attrs)}/>`)
          .join("")}</symbol>`,
    ),
    "</svg>",
  ].join("");
  return cached;
}

/** FNV-1a, base 36: the file's version is its content. */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36).padStart(7, "0");
}

export const SPRITE_VERSION = hash(spriteSvg());
export const SPRITE_URL = `/engine/posters.svg?v=${SPRITE_VERSION}`;
