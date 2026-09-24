import Link from "next/link";

import { CASES_COPY } from "@/lib/landing/chapters";
import type { CaseStudy } from "@/lib/cases";

import DocsFan from "../core/DocsFan";
import { blockStyle, landStyle } from "../engine/plan";
import MotionChapter from "../motion/MotionChapter";

type Props = {
  readonly study: CaseStudy;
  /** More than one case → "See all work" makes sense. */
  readonly total: number;
};

/**
 * §04 — the work. The one real case (anonymised where the client requires it),
 * with its real metrics (counted up on an aria-hidden layer; the settled text
 * is always exactly the CMS value). Its figure — controlled documents, fanned
 * out and stamped — sits inside the engine's ring on the stage, or beside the
 * copy in the static layout.
 */
export default function Cases({ study, total }: Props) {
  return (
    <section
      id="work-cases"
      className="cases ms-block seam-from-graphite"
      data-surface="ink"
      aria-labelledby="cases-title"
      style={{ ...blockStyle("work"), ...landStyle(["work"], "work") }}
    >
      <MotionChapter id="cases" kind="once" className="cases-run">
        <div className="page-col ms-grid">
          <div className="ms-copy cases-copy" data-beat-marker="work">
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

          <div className="engine-slot cases-figure" aria-hidden="true">
            <DocsFan />
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
