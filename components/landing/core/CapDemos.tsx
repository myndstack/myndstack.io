import { CORE } from "@/lib/motion/core-geometry";
import { SPECTRUM } from "@/lib/motion/tokens";
import { DESIGN_DEMO, NEURAL, PIPELINE_DEMO, PRODUCT_DEMO } from "@/lib/landing/demo-geometry";

import { WAVE } from "./CoreRing";

/**
 * The four demos inside the Core during the capabilities run — one per
 * discipline, in the ring's own coordinates so they tilt with it. Decoration
 * (the flow articles carry the words), hidden until the run's timeline shows
 * each in turn; the product demo is server-rendered in its phone layout.
 */
export default function CapDemos() {
  const { frame, blocks } = PRODUCT_DEMO;
  return (
    <svg viewBox={`0 0 ${CORE.size} ${CORE.size}`} className="cap-demos" aria-hidden="true" focusable="false">
      <g data-demo="0" className="demo" style={{ color: "var(--color-spec-ai)" }}>
        {NEURAL.edges.map((edge, i) => (
          <path key={i} d={edge.d} pathLength={1} data-l={edge.layer} className="demo-edge" />
        ))}
        <path d={NEURAL.signal} pathLength={1} className="demo-signal" />
        {NEURAL.layers.map((layer, l) =>
          layer.map((node, i) => (
            <circle key={`${l}-${i}`} cx={node.x} cy={node.y} r="9" data-l={l} className="demo-node" />
          )),
        )}
        <rect {...boxAttrs(NEURAL.gate)} className="demo-gate" />
        <path d={NEURAL.check} pathLength={1} className="demo-check" />
        <text x={NEURAL.gate.x + NEURAL.gate.w / 2} y={NEURAL.gate.y + NEURAL.gate.h + 26} className="demo-label">
          EVAL
        </text>
      </g>

      <g data-demo="1" className="demo" style={{ color: "var(--color-spec-product)" }}>
        <rect {...boxAttrs(frame.phone)} rx="22" className="demo-frame" data-frame />
        <rect x="478" y="326" width="44" height="8" rx="4" className="demo-notch" data-notch />
        {blocks.map((block) => (
          <rect key={block.id} {...boxAttrs(block.phone)} data-block={block.id} className="demo-block" />
        ))}
      </g>

      <g data-demo="2" className="demo" style={{ color: "var(--color-spec-design)" }}>
        <path d={DESIGN_DEMO.tangle} pathLength={1} className="demo-trace" data-trace />
        {DESIGN_DEMO.nodes.map((p, i) => (
          <rect key={i} x={p.x - 7} y={p.y - 7} width="14" height="14" className="demo-pad" />
        ))}
        <text x="500" y="690" className="demo-label" data-before>
          LEGACY · V1
        </text>
        <text x="500" y="690" className="demo-label demo-label--after" data-after>
          MODERN · V2
        </text>
      </g>

      {/* The finale: the whole spectrum's signal, in the chamber. */}
      <g data-demo="wave" className="demo demo-wave">
        <defs>
          <linearGradient id="chamber-wave" gradientUnits="userSpaceOnUse" x1="270" y1="0" x2="730" y2="0">
            <stop offset="0" stopColor={SPECTRUM.ai} />
            <stop offset="0.35" stopColor={SPECTRUM.product} />
            <stop offset="0.5" stopColor={SPECTRUM.lime} />
            <stop offset="0.68" stopColor={SPECTRUM.design} />
            <stop offset="1" stopColor={SPECTRUM.arch} />
          </linearGradient>
        </defs>
        <path d={WAVE} stroke="url(#chamber-wave)" className="demo-wave-bars" />
      </g>

      <g data-demo="3" className="demo" style={{ color: "var(--color-spec-arch)" }}>
        <path d={PIPELINE_DEMO.rail} pathLength={1} className="demo-rail" />
        {PIPELINE_DEMO.stations.map((s) => (
          <g key={s.label} className="demo-station" data-station={s.label}>
            <rect {...boxAttrs(s)} />
            <text x={s.x + s.w / 2} y={s.y + s.h + 28} className="demo-label">
              {s.label}
            </text>
          </g>
        ))}
        <circle cx={PIPELINE_DEMO.stops[3]} cy={PIPELINE_DEMO.y} r="10" className="demo-pulse" data-pulse />
        <circle cx={PIPELINE_DEMO.stops[0]} cy={PIPELINE_DEMO.y} r="9" className="demo-packet" data-packet />
      </g>
    </svg>
  );
}

function boxAttrs(b: { x: number; y: number; w: number; h: number }) {
  return { x: b.x, y: b.y, width: b.w, height: b.h };
}
