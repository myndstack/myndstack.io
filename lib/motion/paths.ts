/**
 * Polyline helpers for SVG morphs. anime tweens a `d` attribute number by
 * number, so a morph is only exact when both paths have the same command
 * skeleton (same letters, same number count). Every morph pair on the landing
 * is built here from the same point count, and `sameSkeleton` is unit-tested
 * on each pair — no `getTotalLength()`, no DOM measuring at runtime.
 */
import type { Point } from "@/lib/motion/core-geometry";
import { polar } from "@/lib/motion/core-geometry";
import { mulberry32 } from "@/lib/motion/field";

const fmt = (n: number): string => String(Math.round(n * 100) / 100);

export function polylineD(points: readonly Point[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${fmt(p.x)} ${fmt(p.y)}`).join("");
}

/** `n` points evenly spaced by arc length along a polyline (endpoints kept). */
export function resample(points: readonly Point[], n: number): Point[] {
  if (points.length === 0 || n <= 0) return [];
  if (points.length === 1 || n === 1) return Array.from({ length: n }, () => ({ ...points[0] }));

  const cumulative = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    cumulative.push(cumulative[i - 1] + Math.hypot(dx, dy));
  }
  const total = cumulative[cumulative.length - 1];

  return Array.from({ length: n }, (_, k) => {
    if (k === n - 1) return { ...points[points.length - 1] };
    const target = (total * k) / (n - 1);
    let seg = 1;
    while (seg < cumulative.length - 1 && cumulative[seg] < target) seg++;
    const span = cumulative[seg] - cumulative[seg - 1];
    const t = span === 0 ? 0 : (target - cumulative[seg - 1]) / span;
    const a = points[seg - 1];
    const b = points[seg];
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  });
}

/** Same command letters in the same order, and the same count of numbers. */
export function sameSkeleton(a: string, b: string): boolean {
  const letters = (d: string) => d.replace(/[^A-Za-z]/g, "");
  const numbers = (d: string) => (d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).length;
  return letters(a) === letters(b) && numbers(a) === numbers(b);
}

/** Points along a circular arc (degrees clockwise from 12 o'clock). */
export function arcPolyline(cx: number, cy: number, r: number, a0: number, a1: number, n: number): Point[] {
  return Array.from({ length: n }, (_, i) => polar(cx, cy, r, a0 + ((a1 - a0) * i) / (n - 1)));
}

/** Points along a horizontal line from x0 to x1 at height y. */
export function linePolyline(x0: number, x1: number, y: number, n: number): Point[] {
  return Array.from({ length: n }, (_, i) => ({ x: x0 + ((x1 - x0) * i) / (n - 1), y }));
}

/**
 * "Legacy": a seeded, tangled scribble inside a 1000×600 box — the before of
 * the Design & modernization chapter.
 */
export function tanglePolyline(seed: number, n: number): Point[] {
  const rand = mulberry32(seed);
  const raw: Point[] = [{ x: 120, y: 300 }];
  let x = 120;
  let y = 300;
  for (let i = 1; i < 18; i++) {
    x = Math.min(880, Math.max(120, x + (rand() - 0.35) * 260));
    y = Math.min(520, Math.max(80, y + (rand() - 0.5) * 320));
    raw.push({ x, y });
  }
  raw.push({ x: 880, y: 300 });
  return resample(raw, n);
}

/**
 * "Modernized": a clean orthogonal circuit trace across the same box, with the
 * same point count as the tangle so the two morph exactly.
 */
export const CIRCUIT_CORNERS: readonly Point[] = [
  { x: 120, y: 300 },
  { x: 300, y: 300 },
  { x: 340, y: 200 },
  { x: 560, y: 200 },
  { x: 600, y: 300 },
  { x: 700, y: 300 },
  { x: 740, y: 400 },
  { x: 820, y: 400 },
  { x: 880, y: 300 },
];

export function circuitPolyline(n: number): Point[] {
  return resample(CIRCUIT_CORNERS, n);
}
