import type { Metadata } from "next";
import Link from "next/link";

import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/Reveal";
import { ROLES } from "@/lib/roles";

const title = "Careers — Myndstack";
const description =
  "Build the stack behind everything. Open engineering and design roles at Myndstack — small team, real ownership, mission-critical work.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/careers" },
  openGraph: { title, description },
};

const PRINCIPLES = [
  {
    n: "01",
    t: "Small team, real ownership",
    d: "No account managers, no ticket queues. You own a layer and the decisions that shape it.",
  },
  {
    n: "02",
    t: "Remote, written-first",
    d: "We work across timezones on written argument. Meetings are the exception, not the calendar.",
  },
  {
    n: "03",
    t: "Mission-critical by default",
    d: "The systems we build carry real load with contractual uptime. That raises the bar and the interest.",
  },
];

export default function CareersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Join the studio"
        title="Build the stack behind everything."
        lede="We hire engineers and designers who care about the layer beneath the product. Small team, real ownership, mission-critical work."
        meta={`${ROLES.length} open roles · Remote`}
        breadcrumbs={[{ label: "Home", href: "/" }]}
      />

      <section className="mx-auto max-w-[1200px] px-5 pt-14 pb-12 sm:px-14">
        <h2 className="sr-only">How we work</h2>
        <div className="grid grid-cols-1 gap-px border-t border-line bg-line xs:grid-cols-2 md:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <Reveal key={p.n} className="bg-ink px-[22px] pt-7 pb-[30px]">
              <div className="mb-8 font-mono text-[13px] text-lime">{p.n}</div>
              <h3 className="m-0 mb-2 font-display text-[22px] font-semibold">{p.t}</h3>
              <p className="m-0 text-sm leading-[1.55] text-t4">{p.d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section
        id="open-roles"
        className="mx-auto max-w-[1200px] scroll-mt-28 px-5 pt-12 pb-[88px] sm:px-14"
      >
        <div className="eyebrow mb-3.5">Open roles</div>
        <h2 className="h2-section mb-9">Four ways in.</h2>

        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {ROLES.map((role, i) => (
            <li key={role.slug}>
              <Reveal delay={i * 0.05}>
                <Link
                  href={`/careers/${role.slug}`}
                  className="ease-brand group flex flex-wrap items-center justify-between gap-4 border border-line bg-surface-3 px-6 py-5 text-white transition-[border-color,transform] duration-160 hover:translate-x-1 hover:border-lime-edge hover:text-white"
                >
                  <span className="min-w-0">
                    <span className="block font-display text-[19px] font-semibold">
                      {role.title}
                    </span>
                    <span className="mt-1 block max-w-[560px] text-[13.5px] leading-[1.5] text-t4">
                      {role.lede}
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-5">
                    <span className="font-mono text-[11px] tracking-[0.1em] text-t5 uppercase">
                      {role.meta}
                    </span>
                    <span
                      aria-hidden="true"
                      className="ease-brand font-mono text-lime transition-transform duration-160 group-hover:translate-x-1"
                    >
                      ▸
                    </span>
                  </span>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>

        <p className="mt-9 mb-0 text-[15px] text-t4">
          Nothing that fits?{" "}
          <Link href="/#contact">Tell us what you&rsquo;d want to work on</Link> — we read
          every one.
        </p>
      </section>
    </>
  );
}
