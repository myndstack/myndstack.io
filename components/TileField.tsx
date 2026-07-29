/**
 * Static abstract backdrop for bento tiles — a still echo of the app's
 * SectionField / HeroNetwork grammar (blueprint grid + lime glow + a sparse
 * signal net). No canvas and no animation, so it costs nothing to render on
 * every tile; it exists to give the larger bento tiles depth where their
 * CMS-sourced copy doesn't reach the edges.
 *
 * Purely decorative (aria-hidden). Render it as the first child of a
 * `relative overflow-hidden` tile, with the tile's real content in a sibling
 * `relative z-1` wrapper so it sits above.
 */

/** Sparse node graph, laid out on a rough grid so it reads as engineered, not
 *  random. Edges first (behind), nodes on top. Coordinates in a 240×240 box. */
const NODES: ReadonlyArray<readonly [number, number]> = [
  [40, 54],
  [128, 36],
  [206, 74],
  [78, 126],
  [170, 150],
  [120, 210],
  [26, 188],
];
const EDGES: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 2],
  [0, 3],
  [1, 3],
  [3, 4],
  [2, 4],
  [3, 5],
  [4, 5],
  [6, 3],
];

export default function TileField({ net = true }: { net?: boolean }) {
  return (
    <div aria-hidden="true" className="tile-field">
      <div className="tile-field-grid" />
      <div className="tile-field-glow" />
      {net ? (
        <svg
          className="tile-field-net"
          viewBox="0 0 240 240"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          {EDGES.map(([a, b]) => (
            <line
              key={`${a}-${b}`}
              x1={NODES[a][0]}
              y1={NODES[a][1]}
              x2={NODES[b][0]}
              y2={NODES[b][1]}
              stroke="currentColor"
              strokeWidth={1}
              opacity={0.55}
            />
          ))}
          {NODES.map(([x, y], i) => (
            <circle
              key={`${x}-${y}`}
              cx={x}
              cy={y}
              r={i === 3 ? 3.4 : 2.2}
              fill="currentColor"
              opacity={i === 3 ? 1 : 0.8}
            />
          ))}
        </svg>
      ) : null}
    </div>
  );
}
