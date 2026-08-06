import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import CheckoutPanel from "@/components/CheckoutPanel";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/Reveal";
import { isPurchasable, purchasableTierBySlug } from "@/lib/pricing-amount";
import { DEFAULT_REGION } from "@/lib/region";
import { getPricingTiers } from "@/lib/sanity/queries";

type Params = { slug: string };

/** Only tiers with a checkout block get a page — today just Scale. */
export async function generateStaticParams() {
  const tiers = await getPricingTiers();
  return tiers.filter(isPurchasable).map((tier) => ({ slug: tier.checkout.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const tier = purchasableTierBySlug(await getPricingTiers(), (await params).slug);
  if (!tier) return {};

  const oneTime = tier.checkout.amountMinor === tier.checkout.annualAmountMinor;
  const title = `${oneTime ? "Book the" : "Subscribe to"} ${tier.name} — Myndstack`;
  return {
    title,
    description: tier.blurb,
    alternates: { canonical: `/pricing/${tier.checkout.slug}` },
    openGraph: { title, description: tier.blurb },
    // A transactional page — keep it out of the index; /#pricing is the landing.
    robots: { index: false, follow: true },
  };
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const tier = purchasableTierBySlug(await getPricingTiers(), (await params).slug);
  if (!tier) notFound();

  // Equal monthly/annual amounts means a single fixed charge (the sprint), not
  // a subscription — the panel drops its billing toggle and the copy follows.
  const oneTime = tier.checkout.amountMinor === tier.checkout.annualAmountMinor;

  return (
    <>
      <PageHeader
        eyebrow="Checkout"
        title={oneTime ? <>Book the {tier.name}</> : <>Subscribe to {tier.name}</>}
        lede={tier.blurb}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Pricing", href: "/#pricing" },
        ]}
      />

      <div className="page-column pt-14 pb-[88px]">
        {/* Mobile order is deliberate and differs from desktop: what you get,
            then the buy panel, then the long-form detail. Source order alone
            gets it — the single-column grid stacks these three children as
            written, and the md: placement puts the text back in one column with
            the panel beside it. No `order` utilities, so the DOM order a screen
            reader and a keyboard walk IS the visual order at every width.

            Before this, the panel came after all four sections: on a phone the
            only call to action sat roughly three screens below the fold. */}
        <div className="grid grid-cols-1 gap-11 md:grid-cols-[1.15fr_1fr] md:gap-x-14">
          <Reveal className="md:col-start-1 md:row-start-1">
            <section>
              <h2 className="m-0 mb-4 font-display text-2xl font-semibold tracking-[-0.02em]">
                What&apos;s included
              </h2>
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex gap-3.5 text-[15.5px] leading-[1.55] text-t3"
                  >
                    <span aria-hidden="true" className="flex-none text-lime">
                      ▸
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>

          {/* Row-spanning so the sticky panel has a tall grid area to travel
              inside on desktop; on mobile it is simply the second block. */}
          {/* Reveal-wrapped so the panel's angular corner ANIMATES open: the
              `.reveal:not(.is-in) [class*=clip-angular]` rule pins `--cut` to 0
              and releases it on entry, which is the site's own tell. Outside a
              Reveal the cut is simply frozen at its final value — the panel was
              wearing the shape without the gesture. */}
          {/* Capped and pushed right. At the column's full width the panel ran
              ~480px, which left every summary row stranded — a label at the far
              left, a number at the far right, nothing between. 400px is the
              width a checkout card wants; the slack goes to the reading column
              instead of stretching the card. */}
          <aside className="md:col-start-2 md:row-start-1 md:row-span-2 md:sticky md:top-28 md:w-full md:max-w-[400px] md:justify-self-end md:self-start">
            <Reveal>
              <CheckoutPanel
                slug={tier.checkout.slug}
                tierName={tier.name}
                description={tier.blurb}
                amountMinorMonthly={tier.checkout.amountMinor}
                amountMinorAnnual={tier.checkout.annualAmountMinor}
                annualNote={tier.annualNote}
                oneTime={oneTime}
                initialRegion={DEFAULT_REGION}
                regionalCharges={tier.checkout.regionalCharges}
              />
            </Reveal>
          </aside>

          <div className="md:col-start-1 md:row-start-2">
            {tier.checkout.howItWorks?.length ? (
              <Reveal>
                <section>
                  <h2 className="m-0 mb-5 font-display text-2xl font-semibold tracking-[-0.02em]">
                    How it works
                  </h2>
                  <ol className="m-0 flex list-none flex-col gap-5 p-0">
                    {tier.checkout.howItWorks.map((step, i) => (
                      <li key={step.title} className="flex gap-4">
                        <span className="mt-0.5 flex-none font-mono text-[12px] font-bold tracking-[0.12em] text-lime tabular-nums">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <div className="mb-1 font-display text-[15.5px] font-semibold text-t1">
                            {step.title}
                          </div>
                          <p className="m-0 text-[14.5px] leading-[1.55] text-t4">
                            {step.body}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              </Reveal>
            ) : null}

            {/* `tier.checkout.assurance` is deliberately NOT rendered here.
                Its three cells restate features 3, 4 and 5 — two of them almost
                word for word ("yours to keep", "if you start within 30 days") —
                so it read as the same list twice, forty pixels apart, dressed
                as reassurance. The field is still in the schema and in Sanity;
                if it comes back it needs copy that says something the feature
                list doesn't. */}
          </div>
        </div>

        {/* Second zone. The panel's job ends with "How it works" — everything
            above is deciding, everything below is answering. The rule marks that
            change, and going full-width here means the FAQs stop sharing a row
            with a column the sticky panel has already left empty.

            Two columns, not one: at 1200px a single column runs ~150 characters
            per line, twice a comfortable measure. */}
        {tier.checkout.faqs?.length ? (
          <Reveal>
            <section className="mt-16 border-t border-line pt-12">
              <h2 className="m-0 mb-6 font-display text-2xl font-semibold tracking-[-0.02em]">
                Common questions
              </h2>
              <dl className="m-0 grid grid-cols-1 gap-x-14 md:grid-cols-2">
                {tier.checkout.faqs.map((faq) => (
                  <div key={faq.q} className="border-t border-line py-5">
                    <dt className="mb-1.5 font-display text-[15.5px] font-semibold text-t2">
                      {faq.q}
                    </dt>
                    <dd className="m-0 text-[14.5px] leading-[1.55] text-t4">
                      {faq.a}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </Reveal>
        ) : null}

        <Reveal>
          <p className="legal-note">
            Prefer to talk first? <Link href="/#contact">Contact sales</Link> — or
            compare every plan on the <Link href="/#pricing">pricing page</Link>.
          </p>
        </Reveal>
      </div>
    </>
  );
}
