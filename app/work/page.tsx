import type { Metadata } from "next";
import Link from "next/link";

import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import Reveal, { STAGGER_S } from "@/components/Reveal";
import { getCases } from "@/lib/sanity/queries";
import { pageMetadata } from "@/lib/metadata";

const title = "Selected work — Myndstack";
const description =
  "PharmaLaunch — cognitive infrastructure for pharma manufacturing feasibility: generated, quality-gated GMP documents, designed and built by Myndstack. In private validation.";

export const metadata: Metadata = pageMetadata({ path: "/work", title, description });

export default async function WorkPage() {
  const cases = await getCases();

  return (
    <>
      <PageHeader
        eyebrow="Selected work"
        title="Cognitive infrastructure, built end to end."
        lede={
          cases.length > 0
            ? "PharmaLaunch is the stack we designed and built: AI generation paired with deterministic rule engines and automated quality gates. In private validation."
            : "Write-ups of recent builds are on their way."
        }
        meta={`${cases.length} case stud${cases.length === 1 ? "y" : "ies"}`}
        breadcrumbs={[{ label: "Home", href: "/" }]}
      />

      <section className="page-column pt-14 pb-22">
        <h2 className="sr-only">Case studies</h2>

        {cases.length === 0 ? (
          <EmptyState
            label="Case studies in progress"
            body="We're writing up recent builds now. In the meantime we're happy to walk you through the work on a call."
            action={{ href: "/#contact", text: "Start a project →" }}
          />
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {cases.map((c, i) => (
            <Reveal key={c.slug} delay={i * STAGGER_S}>
              <Link href={`/work/${c.slug}`} className="block h-full text-t1">
                <div className="card card-lift flex h-full flex-col justify-between p-7">
                  <div>
                    <div className="mb-4 flex flex-wrap gap-2">
                      {c.tags.map((tag) => (
                        <span key={tag} className="chip">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mb-2 font-display text-22 sm:text-30 font-bold tracking-heading">
                      {c.client}
                    </div>
                    <p className="m-0 max-w-[460px] text-15 leading-body text-t4">
                      {c.lede}
                    </p>
                  </div>

                  <div className="mt-7 flex flex-wrap gap-6 border-t border-line pt-4">
                    {c.metrics.slice(0, 3).map((m) => (
                      <div key={m.l}>
                        <div
                          className={`font-display text-22 font-bold tracking-heading ${m.lime ? "text-lime" : ""}`}
                        >
                          {m.v}
                        </div>
                        <div className="mt-1 font-mono text-11 tracking-label text-t5 uppercase">
                          {m.l}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>

        {/* The empty state already carries the call to action. */}
        {cases.length > 0 ? (
          <p className="mt-9 mb-0 text-15 text-t4">
            Working on something like this?{" "}
            <Link href="/#contact" className="underline underline-offset-2">
              Start a project
            </Link>
            .
          </p>
        ) : null}
      </section>
    </>
  );
}
