/**
 * Leader lines between static label ends (legend LEDs, tool-group hue bars)
 * and anchor points on the engine. Labels and anchors are paired in vertical
 * order, and each leader runs horizontally from its label, then at 45° into
 * its anchor. With monotone pairing, 45° diagonals are parallel or disjoint,
 * so leaders never cross — tested over seeded layouts.
 *
 * Leaders exist only while both ends are still (FRAME holds), so this runs
 * when a hold begins or the page re-measures, never per scroll frame.
 */

export type Point = { readonly x: number; readonly y: number };
export type Leader = { readonly from: Point; readonly knee: Point; readonly to: Point };

/**
 * `side` is where the anchors are relative to the labels: "right" when the
 * labels sit left of the engine (the normal layout), "left" otherwise.
 *
 * Crossing-free when consecutive anchors are further apart vertically than
 * their horizontal spread (true of ports and module rims, which sit ≥ 30px
 * apart on one profile). Two anchors 2px apart but 10px across can't be
 * reached in order by straight leaders under any routing.
 */
export function routeLeaders(starts: readonly Point[], anchors: readonly Point[], side: "left" | "right"): Leader[] {
  if (starts.length !== anchors.length) throw new Error("routeLeaders: one anchor per label");
  const byY = (a: Point, b: Point) => a.y - b.y;
  const from = [...starts].sort(byY);
  const to = [...anchors].sort(byY);
  const dir = side === "right" ? 1 : -1;
  return from.map((start, i) => {
    const end = to[i];
    // The knee sits |dy| before the anchor (a 45° run in), but never behind
    // the label: without room for 45° the diagonal steepens instead.
    const ideal = end.x - dir * Math.abs(end.y - start.y);
    const kneeX = dir === 1 ? Math.max(start.x, Math.min(ideal, end.x)) : Math.min(start.x, Math.max(ideal, end.x));
    return { from: start, knee: { x: kneeX, y: start.y }, to: end };
  });
}

type Segment = readonly [Point, Point];

const segmentsOf = (l: Leader): Segment[] => [
  [l.from, l.knee],
  [l.knee, l.to],
];

const orient = (a: Point, b: Point, c: Point) => Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));

/** Proper intersection only: segments that merely touch at an end don't count. */
function crosses([a, b]: Segment, [c, d]: Segment): boolean {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

/** Number of leader pairs that cross (the layout must keep this at 0). */
export function countCrossings(leaders: readonly Leader[]): number {
  let count = 0;
  for (let i = 0; i < leaders.length; i++) {
    for (let j = i + 1; j < leaders.length; j++) {
      const hit = segmentsOf(leaders[i]).some((s) => segmentsOf(leaders[j]).some((t) => crosses(s, t)));
      if (hit) count += 1;
    }
  }
  return count;
}
