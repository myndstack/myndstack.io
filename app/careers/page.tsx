import type { Metadata } from "next";
import Link from "next/link";

import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import Reveal, { STAGGER_S } from "@/components/Reveal";
import { numberWord } from "@/lib/format";
import { getRoles } from "@/lib/sanity/queries";
import { pageMetadata } from "@/lib/metadata";

const title = "Careers — Myndstack";
const description =
  "Build the stack behind everything. Engineering and design roles at Myndstack — a small studio, real ownership, work that ships to production.";

export const metadata: Metadata = pageMetadata({ path: "/careers", title, description });

const PRINCIPLES = [
  {
    n: "01",
    t: "Small studio, real ownership",
    d: "No account managers, no ticket queues. You own a layer and the decisions that shape it.",
  },
  {
    n: "02",
    t: "Remote, written-first",
    d: "We work across timezones on written argument. Meetings are the exception, not the calendar.",
  },
  {
    n: "03",
    t: "Production, not prototypes",
    d: "What we build goes live and gets used. That raises the bar and the interest.",
  },
];

export default async function CareersPage() {
  const roles = await getRoles();

  return (
    <>
      <PageHeader
        eyebrow="Join the studio"
        title="Build the stack behind everything."
        lede="We work with engineers and designers who care about the layer beneath the product. A small studio, real ownership, work that ships to production."
        meta={`${roles.length} open role${roles.length === 1 ? "" : "s"} · Remote`}
        breadcrumbs={[{ label: "Home", href: "/" }]}
      />

      <section className="page-column pt-14 pb-12">
        <h2 className="sr-only">How we work</h2>
        <div className="grid grid-cols-1 gap-px border-t border-line bg-line xs:grid-cols-2 md:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <Reveal key={p.n} className="bg-ink px-6 pt-7 pb-8">
              <div className="mb-8 font-mono text-13 text-lime">{p.n}</div>
              <h3 className="m-0 mb-2 font-display text-22 font-semibold">{p.t}</h3>
              <p className="m-0 text-15 leading-[1.55] text-t4">{p.d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section
        id="open-roles"
        className="page-column scroll-mt-28 pt-12 pb-22"
      >
        <div className="eyebrow mb-3.5">Open roles</div>
        <h2 className="h2-section mb-9">
          {roles.length === 0
            ? "No open roles right now."
            : `${numberWord(roles.length, true)} way${roles.length === 1 ? "" : "s"} in.`}
        </h2>

        {roles.length === 0 ? (
          <EmptyState
            label="Hiring paused"
            body="We aren't hiring for a specific role at the moment. If you'd be a strong fit for the work we do, we'd still like to hear from you."
            action={{ href: "/#contact", text: "Introduce yourself →" }}
          />
        ) : null}

        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {roles.map((role, i) => (
            <li key={role.slug}>
              <Reveal delay={i * STAGGER_S}>
                <Link
                  href={`/careers/${role.slug}`}
                  className="ease-brand group flex flex-wrap items-center justify-between gap-4 border border-line bg-surface-3 px-6 py-5 text-t1 transition-[border-color,transform] duration-160 hover:translate-x-1 hover:border-lime-edge hover:text-t1"
                >
                  <span className="min-w-0">
                    <span className="block font-display text-17 font-semibold">
                      {role.title}
                    </span>
                    <span className="mt-1 block max-w-[560px] text-13 leading-[1.5] text-t4">
                      {role.lede}
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-5">
                    <span className="font-mono text-11 tracking-[0.1em] text-t5 uppercase">
                      {role.meta}
                    </span>
                    <span
                      aria-hidden="true"
                      className="ease-brand font-mono text-lime transition-transform duration-160 group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </span>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>

        <p className="mt-9 mb-0 text-15 text-t4">
          Nothing that fits?{" "}
          <Link href="/#contact" className="underline underline-offset-2">
            Tell us what you&rsquo;d want to work on
          </Link>{" "}
          — we read every one.
        </p>
      </section>
    </>
  );
}
