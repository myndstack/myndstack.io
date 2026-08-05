import Link from "next/link";

import type { PricingTier } from "@/lib/content";
import { DEFAULT_REGION, resolveTiersForRegion } from "@/lib/region";
import PricingCards from "./PricingCards";
import PricingCompare from "./PricingCompare";
import Reveal from "./Reveal";
import Section from "./Section";
import SectionHeader from "./SectionHeader";

/**
 * Pricing ladder: three tiers as cards (Discovery Sprint / Build / Studio, from
 * Sanity) plus a hardcoded Enterprise band below for bespoke, contact-only work.
 * The featured card is filled by default; on a capable pointer the fill FOLLOWS
 * the hovered/focused card (see `.pricing-*` in globals.css).
 *
 * Currency is region-aware: this server render resolves the DEFAULT_REGION so
 * the page stays static, and the client <PricingCards> swaps to the visitor's
 * region (geo + picker) on mount via /api/pricing. See lib/region.ts.
 */
export default function Pricing({ tiers }: { tiers: PricingTier[] }) {
  if (tiers.length === 0) return null;

  // Static, default-region prices for SSR; the client layer swaps in the
  // visitor's region after hydration. Non-region tiers fall back to flat fields.
  const initialTiers = resolveTiersForRegion(tiers, DEFAULT_REGION);

  return (
    <Section id="pricing">
      <SectionHeader
        className="mb-12"
        eyebrow="Pricing"
        title="Start small. Scale when it's working."
        lede="Begin with a fixed-price Discovery Sprint — no long proposal, no risk. Move into a full build, or an embedded team, when you're ready."
      />

      <PricingCards initialTiers={initialTiers} />

      <Reveal>
        <EnterpriseBand />
      </Reveal>

      {/* Deep, granular comparison lives here (opt-in) so the cards stay concise.
          Columns = the live tier names + the hardcoded Enterprise band. */}
      <Reveal>
        <PricingCompare tierNames={[...tiers.map((t) => t.name), ENTERPRISE.name]} />
      </Reveal>

      {/* Per-currency tax/settlement lives on each card now (taxNote); this stays
          a plain prompt so it reads the same in every region. */}
      <p className="mt-8 mb-0 text-[13.5px] text-t5">
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
