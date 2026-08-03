import Link from "next/link";

import type { PricingTier } from "@/lib/content";
import { isPurchasable } from "@/lib/pricing-amount";
import Reveal from "./Reveal";
import Section from "./Section";
import SectionHeader from "./SectionHeader";

/**
 * Three-offer pricing ladder: a fixed-price Discovery Sprint (self-serve
 * checkout), a fixed-scope Build, and a monthly Studio retainer. INR-only —
 * this is an India studio billing in INR, so the old region/currency switcher
 * is gone. A tier that carries a `checkout` block links to its /pricing/[slug]
 * page to pay online; the rest route to contact.
 */
export default function Pricing({ tiers }: { tiers: PricingTier[] }) {
  if (tiers.length === 0) return null;

  return (
    <Section id="pricing">
      <SectionHeader
        className="mb-12"
        eyebrow="Pricing"
        title="Start small. Scale when it's working."
        lede="Begin with a fixed-price Discovery Sprint — no long proposal, no risk. Move to a full build or an embedded studio engagement when you're ready."
      />

      <div className="grid grid-cols-1 gap-[18px] md:grid-cols-3">
        {tiers.map((tier, i) => (
          <Reveal key={tier.name} delay={i * 0.08} className="h-full">
            <PricingCard tier={tier} />
          </Reveal>
        ))}
      </div>

      <p className="mt-8 mb-0 text-[13.5px] text-t5">
        Prices in INR, excl. GST. International clients are billed in INR.{" "}
        <Link
          href="#contact"
          className="text-t3 underline underline-offset-2 hover:text-lime"
        >
          Not sure where to start? Talk to us.
        </Link>
      </p>
    </Section>
  );
}

function PricingCard({ tier }: { tier: PricingTier }) {
  const cardClass = tier.highlighted
    ? "relative flex h-full flex-col border border-lime bg-surface-3 p-[30px] shadow-[0_0_0_1px_#C9F24D,0_20px_50px_rgba(0,0,0,.5)]"
    : "card flex h-full flex-col p-[30px] hover:border-lime-edge";
  const ctaClass = tier.highlighted
    ? "mt-auto block bg-lime p-3 text-center text-[15px] font-semibold text-lime-ink transition-colors hover:bg-lime-hover"
    : "btn-outline mt-auto block p-3 text-center text-[15px] font-semibold";

  return (
    <div className={cardClass}>
      {tier.badge ? (
        <div className="absolute top-5 right-5 bg-lime px-2.5 py-1 font-mono text-[10.5px] font-bold tracking-[0.12em] text-lime-ink uppercase">
          {tier.badge}
        </div>
      ) : null}

      <div className="mb-1.5 font-display text-[19px] font-semibold">{tier.name}</div>
      {/* Reserve two lines so a one-line blurb doesn't misalign the price row. */}
      <div className="mb-[22px] min-h-[42px] text-[13.5px] leading-[1.5] text-t4">
        {tier.blurb}
      </div>

      <div className="mb-6">
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="font-display text-[clamp(28px,4vw,38px)] font-bold tracking-[-0.02em]">
            {tier.price}
          </span>
          {tier.period ? (
            <span className="text-[13px] text-t5">{tier.period}</span>
          ) : null}
        </div>
      </div>

      {/* flex-1 pins the CTA to the bottom so cards in the row align. */}
      <ul className="m-0 mb-6 flex flex-1 list-none flex-col gap-3 p-0">
        {tier.features.map((feature) => (
          <li
            key={feature}
            className={`flex gap-2.5 text-[14.5px] leading-[1.45] ${
              tier.highlighted ? "text-t2" : "text-t3"
            }`}
          >
            <span aria-hidden="true" className="mt-0.5 flex-none text-lime">
              ▸
            </span>
            {feature}
          </li>
        ))}
      </ul>

      {isPurchasable(tier) ? (
        <Link href={`/pricing/${tier.checkout.slug}`} className={ctaClass}>
          {tier.cta}
        </Link>
      ) : (
        <a href="#contact" className={ctaClass}>
          {tier.cta}
        </a>
      )}
    </div>
  );
}
