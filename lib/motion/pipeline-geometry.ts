/**
 * Layout for the Work pipeline diagram, computed analytically so the scrubbed
 * timeline never has to ask the DOM for path lengths (no getTotalLength in a
 * scroll frame). A straight run through evenly spaced nodes: each node's `t` is
 * its fraction along the path, which is exactly where the travelling document
 * glyph reaches it.
 */

export type PipelineLayout = "row" | "column";

export type PipelineNode = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  /** Fraction of the path length at this node, 0..1. */
  readonly t: number;
};

export type PipelineGeometry = {
  readonly d: string;
  readonly length: number;
  readonly nodes: readonly PipelineNode[];
};

type Box = { readonly width: number; readonly height: number; readonly pad: number };

const round = (n: number): number => Math.round(n * 100) / 100;

export function pipelineGeometry(
  ids: readonly string[],
  layout: PipelineLayout,
  box: Box,
): PipelineGeometry {
  const count = ids.length;
  const span = (layout === "row" ? box.width : box.height) - box.pad * 2;
  const step = count > 1 ? span / (count - 1) : 0;
  const cross = round((layout === "row" ? box.height : box.width) / 2);

  const nodes = ids.map((id, i) => {
    const along = round(box.pad + step * i);
    return {
      id,
      x: layout === "row" ? along : cross,
      y: layout === "row" ? cross : along,
      t: count > 1 ? round(i / (count - 1)) : 0,
    };
  });

  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  const length = round(step * Math.max(0, count - 1));
  const d = first && last ? `M${first.x} ${first.y} L${last.x} ${last.y}` : "";

  return { d, length, nodes };
}
