import Link from "next/link";
import type { CSSProperties } from "react";

import { CASES_COPY } from "@/lib/landing/chapters";
import type { CaseStudy } from "@/lib/cases";

import MotionChapter from "../motion/MotionChapter";

const SHEETS = 5;
/** Redaction bar widths (%) per sheet row — the anonymised proof, literally. */
const REDACTIONS = [
  [62, 38, 80],
  [44, 70, 30],
  [76, 52, 40],
  [34, 64, 58],
  [70, 46, 66],
] as const;

type Props = {
  readonly study: CaseStudy;
  /** More than one case → "See all work" makes sense. */
  readonly total: number;
};

/**
 * §04 — the work. The one real case (anonymised where the client requires it),
 * with its real metrics (counted up on an aria-hidden layer; the settled text
 * is always exactly the CMS value). The figure is a stack of controlled
 * documents — redacted, as the proof is — fanning out, gated and stamped.
 */
export default function Cases({ study, total }: Props) {
  return (
    <section id="work-cases" className="cases" aria-labelledby="cases-title">
      <MotionChapter id="cases" kind="once" className="cases-run">
        <div className="cases-bar" aria-hidden="true">
          {(["lime", "ai", "product", "design", "arch"] as const).map((key) => (
            <i key={key} data-hue={key} />
          ))}
        </div>

        <div className="page-col cases-grid">
          <div className="cases-copy">
            <p className="chapter-kicker">
              <span className="stamp">§04</span>
              <span>{CASES_COPY.kicker}</span>
            </p>
            <h2 id="cases-title" className="chapter-title cases-title">
              {CASES_COPY.title}
            </h2>

            <div className="case-id">
              <h3 className="case-client">{study.client}</h3>
              <p className="case-meta">
                {study.industry} · {study.duration} · {study.regions}
              </p>
            </div>
            <p className="chapter-lede case-lede">{study.lede}</p>

            <ul className="case-tags" aria-label="Scope">
              {study.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>

            <dl className="case-metrics">
              {study.metrics.map((m) => (
                <div key={m.l} className={`case-metric${m.lime ? " is-lime" : ""}`}>
                  <dt>{m.l}</dt>
                  <dd>
                    <span className="sr-only">{m.v}</span>
                    <span aria-hidden="true" data-countup={m.v}>
                      {m.v}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>

            <p className="case-stack hud">
              <span className="hud-k">Stack</span>
              <span>{study.stack.join(" · ")}</span>
            </p>

            <div className="case-links">
              <Link href={`/work/${study.slug}`} className="btn btn-lime">
                Read the case study →
              </Link>
              {total > 1 ? (
                <Link href="/work" className="btn btn-outline">
                  See all work
                </Link>
              ) : null}
            </div>
          </div>

          <div className="cases-figure" aria-hidden="true">
            <div className="docs">
              <div className="docs-plane">
                {Array.from({ length: SHEETS }, (_, k) => (
                  <div key={k} className="doc" data-doc={k} style={{ "--i": k } as CSSProperties}>
                    <div className="doc-head">
                      <span>DOC-{String(k + 1).padStart(3, "0")}</span>
                      <span>CONTROLLED · REV {k + 1}</span>
                    </div>
                    <div className="doc-rows">
                      {REDACTIONS[k].map((w, r) => (
                        <span key={r} className="doc-redact" style={{ width: `${w}%` }} />
                      ))}
                    </div>
                    <div className="doc-table">
                      {Array.from({ length: 12 }, (_, c) => (
                        <i key={c} />
                      ))}
                    </div>
                    <span className="doc-stamp">PASS</span>
                  </div>
                ))}
                <span className="doc-scan" />
              </div>
            </div>
            <p className="docs-caption hud">
              <span className="hud-k">Every run</span>
              <span>Drafted · gated · human-verified</span>
            </p>
          </div>
        </div>
      </MotionChapter>
    </section>
  );
}
