import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import CheckoutPanel from "@/components/CheckoutPanel";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/Reveal";
import { isPurchasable, purchasableTierBySlug } from "@/lib/pricing-amount";
import { DEFAULT_REGION, resolveTierForRegion } from "@/lib/region";
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

  // Region-aware DISPLAY for the panel (the charge stays INR). SSR uses the
  // default region; the panel swaps to the visitor's region on mount. See
  // lib/region.ts — same source the pricing section resolves from.
  const display = resolveTierForRegion(tier, DEFAULT_REGION);

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

      <div className="mx-auto max-w-[1200px] px-5 pt-14 pb-[88px] sm:px-14">
        <div className="grid grid-cols-1 gap-14 md:grid-cols-[1.15fr_1fr]">
          <article>
            <Reveal>
              <section className="mb-11">
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

            {tier.checkout.howItWorks?.length ? (
              <Reveal>
                <section className="mb-11">
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

            {tier.checkout.assurance?.length ? (
              <Reveal>
                <ul className="mb-11 grid list-none grid-cols-1 gap-px overflow-hidden border border-line bg-line p-0 sm:grid-cols-3">
                  {tier.checkout.assurance.map((point) => (
                    <li
                      key={point.title}
                      className="bg-surface-3 p-5 shadow-[var(--edge-lip)]"
                    >
                      <div className="mb-1 font-mono text-[11px] font-bold tracking-[0.1em] text-lime uppercase">
                        {point.title}
                      </div>
                      <p className="m-0 text-[13px] leading-[1.5] text-t4">
                        {point.body}
                      </p>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ) : null}

            {tier.checkout.faqs?.length ? (
              <Reveal>
                <section className="mb-11">
                  <h2 className="m-0 mb-5 font-display text-2xl font-semibold tracking-[-0.02em]">
                    Common questions
                  </h2>
                  <dl className="m-0 flex flex-col gap-0">
                    {tier.checkout.faqs.map((faq) => (
                      <div key={faq.q} className="border-t border-line py-5 last:pb-0">
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
          </article>

          <aside className="md:sticky md:top-28 md:self-start">
            <CheckoutPanel
              slug={tier.checkout.slug}
              tierName={tier.name}
              amountMinorMonthly={tier.checkout.amountMinor}
              amountMinorAnnual={tier.checkout.annualAmountMinor}
              annualNote={tier.annualNote}
              oneTime={oneTime}
              initialRegion={DEFAULT_REGION}
              initialDisplayPrice={display.price}
              initialDisplayAnnualPrice={display.annualPrice}
            />
          </aside>
        </div>
      </div>
    </>
  );
}
