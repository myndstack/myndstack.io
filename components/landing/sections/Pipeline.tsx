import Annot from "../blueprint/Annot";
import SectionMark from "../blueprint/SectionMark";
import MotionChapter from "../motion/MotionChapter";
import { FIG, PIPELINE_BOX, PIPELINE_STAGES } from "@/lib/landing/content";
import { pipelineGeometry, type PipelineLayout } from "@/lib/motion/pipeline-geometry";
import type { CaseStudy } from "@/lib/cases";

const NODE_W = 104;
const NODE_H = 48;
const GATE = 30;

const isGate = (id: string) => id.startsWith("qa");

/** The diagram for one layout. Same geometry function as the motion builder. */
function Diagram({ layout }: { layout: PipelineLayout }) {
  const box = PIPELINE_BOX[layout];
  const g = pipelineGeometry(
    PIPELINE_STAGES.map((s) => s.id),
    layout,
    box,
  );
  const first = g.nodes[0];

  return (
    <svg
      data-pipeline={layout}
      viewBox={`0 0 ${box.width} ${box.height}`}
      className={layout === "row" ? "hidden w-full sm:block" : "mx-auto block w-full max-w-[300px] sm:hidden"}
      aria-hidden="true"
    >
      {/* Track (the plan) and progress (what has run), same path. */}
      <path className="bp-dash text-paper-t4" d={g.d} />
      <path data-progress className="bp-line text-ink" pathLength={1} d={g.d} strokeWidth={2} />

      {g.nodes.map((node, i) => {
        const stage = PIPELINE_STAGES[i];
        const labelOffset = layout === "row" ? NODE_H / 2 + 26 : 0;
        const labelX = layout === "row" ? node.x : node.x + NODE_W / 2 + 18;
        const labelY = layout === "row" ? node.y + labelOffset : node.y + 4;
        const approved = stage.id === "approved";
        return (
          <g key={stage.id} data-node={stage.id}>
            {isGate(stage.id) ? (
              <>
                <rect
                  className="fill-paper stroke-paper-t4"
                  x={node.x - GATE / 2}
                  y={node.y - GATE / 2}
                  width={GATE}
                  height={GATE}
                  strokeDasharray="3 3"
                  transform={`rotate(45 ${node.x} ${node.y})`}
                />
                <rect
                  className="bp-solid fill-ink"
                  data-built
                  x={node.x - GATE / 2}
                  y={node.y - GATE / 2}
                  width={GATE}
                  height={GATE}
                  transform={`rotate(45 ${node.x} ${node.y})`}
                />
                <text
                  className="bp-solid fill-ink font-mono"
                  data-stamp
                  // Above the gate in a row; beside it in a column, clear of
                  // the vertical connector.
                  x={layout === "row" ? node.x : node.x - GATE}
                  y={layout === "row" ? node.y - GATE : node.y + 4}
                  textAnchor={layout === "row" ? "middle" : "end"}
                  fontSize={11}
                  fontWeight={700}
                  letterSpacing="0.12em"
                >
                  PASS
                </text>
              </>
            ) : (
              <>
                <rect
                  className="fill-paper stroke-paper-t4"
                  x={node.x - NODE_W / 2}
                  y={node.y - NODE_H / 2}
                  width={NODE_W}
                  height={NODE_H}
                  strokeDasharray="3 3"
                />
                <rect
                  className={`bp-solid ${approved ? "fill-lime stroke-ink" : "fill-paper-2 stroke-ink"}`}
                  data-built
                  x={node.x - NODE_W / 2}
                  y={node.y - NODE_H / 2}
                  width={NODE_W}
                  height={NODE_H}
                  strokeWidth={1.5}
                />
              </>
            )}
            <text
              className="fill-ink font-mono"
              x={isGate(stage.id) ? labelX : layout === "row" ? node.x : node.x}
              y={isGate(stage.id) ? labelY : node.y + 4}
              textAnchor={layout === "column" && isGate(stage.id) ? "start" : "middle"}
              fontSize={11}
              letterSpacing="0.1em"
            >
              {stage.label.toUpperCase()}
            </text>
          </g>
        );
      })}

      {/* The document travelling the pipeline. Sits on the first node; the
          scrub translates it along the path. */}
      <g data-glyph>
        <g
          transform={
            layout === "row"
              ? `translate(${first.x - 11} ${first.y - NODE_H / 2 - 64})`
              : `translate(${first.x - NODE_W / 2 - 44} ${first.y - 14})`
          }
        >
          <path className="fill-paper stroke-ink" strokeWidth={1.5} d="M0 0 H15 L22 7 V28 H0 Z" />
          <path className="stroke-ink" strokeWidth={1} d="M4 12 H18 M4 17 H18 M4 22 H13" />
        </g>
      </g>
    </svg>
  );
}

/**
 * FIG.04 — PharmaLaunch as a pipeline, on paper (the "built" surface). Pinned
 * and scrubbed on desktop: a document leaves the brief, is drafted, checked by
 * the rule engine, passes the quality gates and comes out approved; then the
 * case's real metrics (from Sanity) count up. Phones: column layout, no pin.
 */
export default function Pipeline({ study }: { readonly study: CaseStudy }) {
  return (
    <MotionChapter id="pipeline" kind="scrub">
      <section id="work-cases" tabIndex={-1} className="surface-paper paper-sheet relative outline-none sm:h-[260svh]">
        <div data-sticky className="py-22 sm:sticky sm:top-0 sm:flex sm:h-svh sm:items-center sm:py-0">
          <div className="page-column w-full">
            <Annot className="mb-4">{FIG.pipeline}</Annot>
            <SectionMark />
            <div className="eyebrow mb-4">Selected work</div>
            <h2 className="h2-section max-w-[760px]">{study.client}: built to pass the audit.</h2>
            <p className="mt-4 mb-0 max-w-[620px] text-17 leading-body text-paper-t4">{study.lede}</p>

            {/* What the diagram shows, as text (the drawing itself is aria-hidden). */}
            <ol className="sr-only">
              <li>A brief goes in.</li>
              <li>AI drafts the document.</li>
              <li>A deterministic rule engine checks it.</li>
              <li>It passes the quality gates.</li>
              <li>An approved, controlled document comes out.</li>
            </ol>

            <div className="my-10 sm:my-12">
              <Diagram layout="row" />
              <Diagram layout="column" />
            </div>

            <dl className="m-0 grid grid-cols-2 gap-6 border-t border-paper-line pt-6 md:grid-cols-4">
              {study.metrics.map((m) => (
                // Label first in the DOM (dt before dd), value first on screen.
                <div key={m.l} className="flex flex-col-reverse">
                  <dt className="annot mt-2">{m.l}</dt>
                  <dd className="m-0 font-display text-30 font-bold tracking-heading">
                    <span className="sr-only">{m.v}</span>
                    {/* Counted up by the scrub via data-count (CSS renders it). */}
                    <span data-countup={m.v} data-count={m.v} aria-hidden="true" />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
    </MotionChapter>
  );
}
