import Link from "next/link";

import { CASES_COPY } from "@/lib/landing/chapters";
import type { CaseStudy } from "@/lib/cases";

import DocsFan from "../core/DocsFan";
import { Beat, Scene, Slot } from "../scene/Scene";
import { Kicker, Lede, Rise, Title } from "../type/Type";

type Props = {
  readonly study: CaseStudy;
  /** More than one case → "See all work" makes sense. */
  readonly total: number;
};

/**
 * §04 — the work. The ring carries left and turns a little; inside it, the
 * case's controlled documents fan out and are stamped (the stage's overlay).
 * The copy holds columns 7–12: the real case, anonymised where the client
 * requires it, what it was built with, and its real metrics in one row.
 */
export default function Cases({ study, total }: Props) {
  return (
    <Scene id="work" anchor="work-cases" labelledBy="cases-title">
      <Beat id="work" className="work">
        <div className="work-copy">
          <Kicker n="§04">{CASES_COPY.kicker}</Kicker>
          <Title id="cases-title" lines={[CASES_COPY.title]} />
          <Rise i={0} className="case-id">
            <h3 className="t-title-m">{study.client}</h3>
            <p className="t-mono">
              {study.industry} · {study.duration} · {study.regions}
            </p>
          </Rise>
          <Lede i={1}>{study.lede}</Lede>
          {study.stack.length ? (
            <Rise as="ul" i={2} className="case-stack" aria-label="Built with">
              {study.stack.map((item) => (
                <li key={item} className="ms-chip">
                  {item}
                </li>
              ))}
            </Rise>
          ) : null}
          <Rise as="dl" i={3} className="metrics">
            {study.metrics.map((m) => (
              <div key={m.l} className={`metric${m.lime ? " is-accent" : ""}`}>
                <dt className="t-mono">{m.l}</dt>
                <dd className="t-readout">{m.v}</dd>
              </div>
            ))}
          </Rise>
          <Rise i={4} className="work-links">
            <Link href={`/work/${study.slug}`} className="btn btn-lime">
              Read the case study →
            </Link>
            {total > 1 ? (
              <Link href="/work" className="btn btn-outline">
                See all work
              </Link>
            ) : null}
          </Rise>
        </div>
        <div className="slot slot--work" aria-hidden="true">
          <DocsFan />
        </div>
        <Slot beat="work" className="slot--work-ring" />
      </Beat>
    </Scene>
  );
}
