import Link from "next/link";

import { EnterpriseBand, ENTERPRISE } from "@/components/Pricing";
import PricingCards from "@/components/PricingCards";
import PricingCompare from "@/components/PricingCompare";
import type { PricingTier } from "@/lib/content";
import { PRICING_COPY } from "@/lib/landing/chapters";
import { DEFAULT_REGION, resolveTiersForRegion } from "@/lib/region";

import { DialPoster } from "../engine/Dial";
import { Kicker, Lede, Title } from "../type/Type";

/**
 * §08 — pricing, as a quotation sheet: paper, sliding up over the studio
 * with a lime edge. Every piece of the live pricing logic is reused as-is
 * (region-aware prices, the currency picker, checkout links, the Enterprise
 * band, the comparison) — the landing only restyles it, scoped to itself.
 * Beside the heading, a coverage dial: the tier under the pointer or focus
 * shows how much of the engine it lights (the director listens, delegated).
 */
export default function PricingChapter({ tiers }: { readonly tiers: PricingTier[] }) {
  if (tiers.length === 0) return null;
  const initialTiers = resolveTiersForRegion(tiers, DEFAULT_REGION);

  return (
    <section id="pricing" className="sheet sheet--pricing" data-skin="drafting" data-accent="lime" data-overlap="" data-edge="front" aria-labelledby="pricing-title">
      <div className="ms-grid pricing-head">
        <div className="pricing-copy" data-reveal-group>
          <Kicker n="§08">{PRICING_COPY.kicker}</Kicker>
          <Title id="pricing-title" lines={[PRICING_COPY.title]} />
          <Lede>{PRICING_COPY.lede}</Lede>
        </div>
        <div className="pricing-dial" data-coverage="0" aria-hidden="true">
          <DialPoster id="pricing-dial" />
          <p className="pricing-dial-label t-mono-10">Coverage</p>
        </div>
      </div>
      <div className="ms-grid">
        <div className="pricing-body" data-reveal-group>
          <PricingCards initialTiers={initialTiers} />
          <div data-tier-band>
            <EnterpriseBand />
          </div>
          <PricingCompare tierNames={[...tiers.map((t) => t.name), ENTERPRISE.name]} />
          <p className="pricing-note t-body">
            <Link href="#contact" className="ms-link">
              Not sure which fits? Start a project — we’ll scope it with you.
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
