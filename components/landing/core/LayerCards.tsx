import type { CSSProperties, ReactNode } from "react";

import { PLATFORM_HUES } from "@/lib/landing/chapters";

/**
 * What each layer of the stack is, as software — the card beside a station's
 * module: an app screen (interface), an agent's trace (models), an API under
 * autoscaling (compute), a vector search (data). Illustrative wireframes in
 * the sheet's ink, aria-hidden: the station's title and chips carry the words.
 */

const v = (vars: Record<string, string | number>) => vars as CSSProperties;

function Card({ layer, file, status, children }: { readonly layer: number; readonly file: string; readonly status: string; readonly children: ReactNode }) {
  return (
    <figure className="layer-card" data-hue={PLATFORM_HUES[layer]} data-layer={layer} data-rise style={v({ "--ri": 1 })} aria-hidden="true">
      <figcaption className="lc-bar">
        <span className="lc-file">{file}</span>
        <span className="lc-status">{status}</span>
      </figcaption>
      <div className="lc-body">{children}</div>
    </figure>
  );
}

/** 01 Interface: the same product on the web and in the hand. */
function InterfaceCard() {
  return (
    <Card layer={0} file="apps/web · apps/ios" status="preview">
      <div className="ui">
        <div className="ui-browser">
          <div className="ui-url">
            <i />
            <i />
            <i />
            <span>localhost:3000/orders</span>
          </div>
          <div className="ui-page">
            <div className="ui-side">
              <b className="is-on" />
              <b />
              <b />
              <b />
            </div>
            <div className="ui-main">
              <b className="ui-h" />
              <div className="ui-tiles">
                <div className="ui-tile">
                  <svg viewBox="0 0 60 24" preserveAspectRatio="none">
                    <path d="M0 20 L10 16 L20 18 L30 10 L40 12 L50 5 L60 7" pathLength={1} />
                  </svg>
                </div>
                <div className="ui-tile">
                  <b />
                  <b />
                </div>
              </div>
              <b className="ui-row" />
              <b className="ui-row" />
              <b className="ui-row is-short" />
            </div>
          </div>
        </div>
        <div className="ui-phone">
          <b className="ui-notch" />
          <b className="ui-h" />
          <b className="ui-block" />
          <b className="ui-row" />
          <b className="ui-row is-short" />
          <b className="ui-cta" />
        </div>
      </div>
    </Card>
  );
}

const SPANS = [
  { name: "plan", x: 0, w: 16 },
  { name: "retrieve", x: 12, w: 30 },
  { name: "tool · crm", x: 40, w: 16 },
  { name: "generate", x: 54, w: 42 },
] as const;

/** 02 Models: an agent's run, span by span, gated by its evals. */
function ModelsCard() {
  return (
    <Card layer={1} file="trace · triage-agent" status="✓ passed">
      <ol className="trace">
        {SPANS.map((span, i) => (
          <li key={span.name} style={v({ "--x": `${span.x}%`, "--w": `${span.w}%`, "--k": i })}>
            <span>{span.name}</span>
            <i />
          </li>
        ))}
      </ol>
      <p className="evals">
        {["grounded", "safe", "on-task"].map((e, i) => (
          <span key={e} style={v({ "--k": i })}>
            ✓ {e}
          </span>
        ))}
      </p>
    </Card>
  );
}

/** 03 Compute: an API taking load while its instances step up and back down. */
function ComputeCard() {
  const steps = [1, 1, 2, 2, 3, 4, 4, 3, 2, 2];
  const w = 300 / steps.length;
  const area = `M0 100 ${steps.map((s, i) => `L${i * w} ${100 - s * 20} L${(i + 1) * w} ${100 - s * 20}`).join(" ")} L300 100 Z`;
  return (
    <Card layer={2} file="api · /v1/triage" status="autoscale">
      <svg className="load" viewBox="0 0 300 100" preserveAspectRatio="none">
        {[25, 50, 75].map((y) => (
          <line key={y} x1="0" x2="300" y1={y} y2={y} className="load-grid" />
        ))}
        <path d={area} className="load-area" />
        <path d="M0 86 C30 84 45 70 70 66 S110 40 140 30 S190 16 210 24 S250 50 300 58" pathLength={1} className="load-line" />
      </svg>
      <ul className="log">
        <li style={v({ "--k": 0 })}>
          <b>POST</b> /v1/triage <em>200</em>
        </li>
        <li style={v({ "--k": 1 })}>
          <b>scale</b> 2 → 4 instances
        </li>
        <li style={v({ "--k": 2 })}>
          <b>GET</b> /v1/orders <em>200</em>
        </li>
      </ul>
    </Card>
  );
}

const MATCHES = [
  { id: "ord_1842", score: 0.94 },
  { id: "ord_2210", score: 0.91 },
  { id: "ord_0977", score: 0.87 },
] as const;

/** 04 Data: pipelines in, a vector index, a search that finds by meaning. */
function DataCard() {
  return (
    <Card layer={3} file="search · orders" status="vector">
      <p className="query">
        similar(<q>late delivery, pune</q>)
      </p>
      <ol className="matches">
        {MATCHES.map((m, i) => (
          <li key={m.id} style={v({ "--s": m.score, "--k": i })}>
            <span>{m.id}</span>
            <i />
            <em>{m.score.toFixed(2)}</em>
          </li>
        ))}
      </ol>
      <p className="flowline">
        <span>ingest</span>→<span>embed</span>→<span>index</span>
      </p>
    </Card>
  );
}

export default function LayerCard({ layer }: { readonly layer: number }) {
  if (layer === 0) return <InterfaceCard />;
  if (layer === 1) return <ModelsCard />;
  if (layer === 2) return <ComputeCard />;
  return <DataCard />;
}
