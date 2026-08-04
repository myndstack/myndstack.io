import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import CheckoutPanel from "@/components/CheckoutPanel";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/Reveal";
import { isPurchasable, purchasableTierBySlug } from "@/lib/pricing-amount";
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
            />
          </aside>
        </div>
      </div>
    </>
  );
}
