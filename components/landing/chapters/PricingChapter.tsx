import Link from "next/link";

import { EnterpriseBand, ENTERPRISE } from "@/components/Pricing";
import PricingCards from "@/components/PricingCards";
import PricingCompare from "@/components/PricingCompare";
import type { PricingTier } from "@/lib/content";
import { PRICING_COPY } from "@/lib/landing/chapters";
import { DEFAULT_REGION, resolveTiersForRegion } from "@/lib/region";

import { DialPoster } from "../engine/Posters";
import MotionChapter from "../motion/MotionChapter";

/**
 * §08 — pricing. Every piece of the live pricing logic is reused as-is:
 * PricingCards (region-aware prices, currency picker, /api/pricing refetch,
 * `isPurchasable` → /pricing/[slug] checkout), the Enterprise band and the
 * comparison table. The landing only reframes it: a dial beside the heading
 * (the engine's first dock) lights the arc of whichever tier is under the
 * pointer or focus — the director listens here, delegated, so PricingCards
 * stays untouched — and the featured tier wears the spectrum as a beam.
 */
export default function PricingChapter({ tiers }: { readonly tiers: PricingTier[] }) {
  if (tiers.length === 0) return null;
  const initialTiers = resolveTiersForRegion(tiers, DEFAULT_REGION);

  return (
    <section id="pricing" className="pricing-ch seam-from-ink" data-surface="graphite" aria-labelledby="pricing-title">
      <MotionChapter id="pricing" kind="once" className="page-col pricing-run">
        <div className="pricing-head">
          <div className="pricing-head-copy">
            <p className="chapter-kicker">
              <span className="stamp">§08</span>
              <span>{PRICING_COPY.kicker}</span>
            </p>
            <h2 id="pricing-title" className="chapter-title pricing-title">
              {PRICING_COPY.title}
            </h2>
            <p className="chapter-lede">{PRICING_COPY.lede}</p>
          </div>
          <div
            className="engine-dock engine-dock--pricing"
            data-host="dock-pricing"
            data-beat-marker="pricing"
            aria-hidden="true"
          >
            <DialPoster id="dock-pricing" />
          </div>
        </div>

        <PricingCards initialTiers={initialTiers} />
        <div data-tier-band>
          <EnterpriseBand />
        </div>
        <PricingCompare tierNames={[...tiers.map((t) => t.name), ENTERPRISE.name]} />

        <p className="pricing-note">
          <Link href="#contact" className="ulink">
            Not sure which fits? Start a project — we’ll scope it with you.
          </Link>
        </p>
      </MotionChapter>
    </section>
  );
}
