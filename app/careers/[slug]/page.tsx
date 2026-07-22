import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import ApplicationForm from "@/components/ApplicationForm";
import PageHeader from "@/components/PageHeader";
import { SITE_URL } from "@/lib/content";
import { jsonLd } from "@/lib/format";
import { getRole, ROLES } from "@/lib/roles";

type Params = { slug: string };

export function generateStaticParams() {
  return ROLES.map((role) => ({ slug: role.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const role = getRole((await params).slug);
  if (!role) return {};

  const title = `${role.title} — Careers at Myndstack`;
  return {
    title,
    description: role.lede,
    alternates: { canonical: `/careers/${role.slug}` },
    openGraph: { title, description: role.lede },
  };
}

export default async function RolePage({ params }: { params: Promise<Params> }) {
  const role = getRole((await params).slug);
  if (!role) notFound();

  const facts = [
    { label: "Team", value: role.team },
    { label: "Location", value: role.location },
    { label: "Type", value: role.type },
    { label: "Package", value: role.salary },
  ];

  const lists = [
    { heading: "What you'll do", items: role.responsibilities, marker: "▸" },
    { heading: "What we're looking for", items: role.requirements, marker: "▸" },
    { heading: "Nice to have", items: role.bonus, marker: "—" },
  ];

  return (
    <>
      {/* JobPosting markup so the role can surface in job search results. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "JobPosting",
            title: role.title,
            description: [role.lede, ...role.about].join(" "),
            employmentType: "FULL_TIME",
            hiringOrganization: {
              "@type": "Organization",
              name: "Myndstack",
              sameAs: SITE_URL,
            },
            jobLocationType: "TELECOMMUTE",
            applicantLocationRequirements: { "@type": "Country", name: "India" },
            url: `${SITE_URL}/careers/${role.slug}`,
          }),
        }}
      />

      <PageHeader
        eyebrow={`Careers · ${role.team}`}
        title={role.title}
        lede={role.lede}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Careers", href: "/careers" },
        ]}
      />

      <div className="mx-auto max-w-[1200px] px-5 pt-14 pb-[88px] sm:px-14">
        <div className="grid grid-cols-1 gap-14 md:grid-cols-[1.15fr_1fr]">
          <article>
            <dl className="mb-11 grid grid-cols-2 gap-px overflow-hidden border border-line bg-line xs:grid-cols-4">
              {facts.map((fact) => (
                <div key={fact.label} className="bg-surface-3 px-5 py-4">
                  <dt className="label-mono mb-1.5 text-t4">{fact.label}</dt>
                  <dd className="m-0 font-display text-[15px] font-semibold">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>

            <section className="legal-prose mb-11">
              <h2>About the role</h2>
              {role.about.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </section>

            {lists.map((list) => (
              <section key={list.heading} className="mb-11">
                <h2 className="m-0 mb-4 font-display text-2xl font-semibold tracking-[-0.02em]">
                  {list.heading}
                </h2>
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {list.items.map((item) => (
                    <li
                      key={item}
                      className="flex gap-3.5 text-[15.5px] leading-[1.55] text-t3"
                    >
                      <span
                        aria-hidden="true"
                        className={`flex-none ${list.marker === "▸" ? "text-lime" : "text-t7"}`}
                      >
                        {list.marker}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <p className="legal-note">
              Not quite your role?{" "}
              <Link href="/careers">See the other three openings</Link>.
            </p>
          </article>

          <aside className="md:sticky md:top-28 md:self-start">
            <div className="clip-angular-26 border border-line bg-surface p-7">
              <div className="eyebrow mb-3.5">Apply</div>
              <h2 className="m-0 mb-2 font-display text-2xl font-semibold tracking-[-0.02em]">
                {role.title}
              </h2>
              <p className="mt-0 mb-6 text-sm leading-[1.55] text-t4">
                No cover letter needed. Links and a few honest lines beat a formatted CV.
              </p>
              <ApplicationForm role={role.title} />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
