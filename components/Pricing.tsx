import Link from "next/link";

import type { PricingTier } from "@/lib/content";
import { isPurchasable } from "@/lib/pricing-amount";
import Reveal from "./Reveal";
import Section from "./Section";
import SectionHeader from "./SectionHeader";

/**
 * Pricing ladder: three tiers as cards (Discovery Sprint / Build / Studio, from
 * Sanity) plus a hardcoded Enterprise band below for bespoke, contact-only work.
 * The featured card is filled by default; on a capable pointer the fill FOLLOWS
 * the hovered/focused card (see `.pricing-*` in globals.css). INR display for
 * now — region-aware currency lands in a later slice.
 */
export default function Pricing({ tiers }: { tiers: PricingTier[] }) {
  if (tiers.length === 0) return null;

  return (
    <Section id="pricing">
      <SectionHeader
        className="mb-12"
        eyebrow="Pricing"
        title="Start small. Scale when it's working."
        lede="Begin with a fixed-price Discovery Sprint — no long proposal, no risk. Move into a full build, or an embedded team, when you're ready."
      />

      <div className="pricing-grid grid grid-cols-1 gap-[18px] md:grid-cols-3">
        {tiers.map((tier, i) => (
          <Reveal key={tier.name} delay={i * 0.08} className="h-full">
            <PricingCard tier={tier} />
          </Reveal>
        ))}
      </div>

      <EnterpriseBand />

      <p className="mt-8 mb-0 text-[13.5px] text-t5">
        Prices in INR, excl. GST.{" "}
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

/**
 * Renders a "from ₹99,999" price as a small muted "from" + the big number, so
 * the leading word never competes with the amount. Plain strings (no "from ")
 * render whole, big.
 */
function Price({ price, period }: { price: string; period?: string }) {
  const from = /^from\s+/i.exec(price);
  const main = from ? price.slice(from[0].length) : price;
  return (
    <div className="flex flex-wrap items-baseline gap-x-1.5">
      {from ? <span className="text-[13px] font-normal text-t5">from</span> : null}
      <span className="font-display text-[clamp(28px,4vw,38px)] font-bold tracking-[-0.02em]">
        {main}
      </span>
      {period ? <span className="text-[13px] text-t5">{period}</span> : null}
    </div>
  );
}

function PricingCard({ tier }: { tier: PricingTier }) {
  return (
    <div className={`pricing-card${tier.highlighted ? " pricing-card--featured" : ""}`}>
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
        <Price price={tier.price} period={tier.period} />
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
        <Link href={`/pricing/${tier.checkout.slug}`} className="pricing-cta">
          {tier.cta}
        </Link>
      ) : (
        <a href="#contact" className="pricing-cta">
          {tier.cta}
        </a>
      )}
    </div>
  );
}

/**
 * Enterprise is a different *kind* of offer — bespoke, contact-only — so it reads
 * as a full-width band below the three tiers rather than a cramped fourth card.
 * Hardcoded here (like the section header) since it's positioning, not editorial
 * copy; it still appears as a column in the comparison table.
 */
const ENTERPRISE = {
  name: "Enterprise",
  tag: "Custom · priced per engagement",
  blurb:
    "For large or regulated programs — custom scope, delivered under your terms.",
  points: [
    "A dedicated, ring-fenced team",
    "Security review, SLAs & terms in your SOW",
    "Procurement, compliance & MSA-ready",
  ],
  cta: "Let's talk →",
} as const;

function EnterpriseBand() {
  return (
    <div className="mt-[18px] flex flex-col gap-6 border border-line bg-surface-3 p-[30px] md:flex-row md:items-center md:justify-between md:gap-10">
      <div className="md:max-w-[640px]">
        <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display text-[19px] font-semibold">
            {ENTERPRISE.name}
          </span>
          <span className="font-mono text-[12px] text-t5">{ENTERPRISE.tag}</span>
        </div>
        <p className="m-0 text-[13.5px] leading-[1.5] text-t4">{ENTERPRISE.blurb}</p>
        <ul className="mt-4 flex list-none flex-col flex-wrap gap-x-7 gap-y-2 p-0 sm:flex-row">
          {ENTERPRISE.points.map((pt) => (
            <li
              key={pt}
              className="flex gap-2.5 text-[13.5px] leading-[1.4] text-t3"
            >
              <span aria-hidden="true" className="mt-0.5 flex-none text-lime">
                ▸
              </span>
              {pt}
            </li>
          ))}
        </ul>
      </div>
      <a
        href="#contact"
        className="btn-outline block shrink-0 px-7 py-3 text-center text-[15px] font-semibold"
      >
        {ENTERPRISE.cta}
      </a>
    </div>
  );
}
