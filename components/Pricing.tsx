"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PricingTier, RegionCode } from "@/lib/content";
import { isPurchasable } from "@/lib/pricing-amount";
import {
  DEFAULT_REGION,
  resolveTiersForRegion,
  type ResolvedTier,
} from "@/lib/region";
import CurrencyPicker from "./CurrencyPicker";
import PricingCompare, { tierNamesOf } from "./PricingCompare";
import Reveal from "./Reveal";
import Section from "./Section";
import SectionHeader from "./SectionHeader";

type Billing = "monthly" | "annual";

/** Best-effort analytics — Plausible when present, no-op otherwise. */
function track(event: string, props?: Record<string, string>) {
  if (typeof window === "undefined") return;
  const plausible = (window as unknown as { plausible?: (name: string, opts?: { props?: Record<string, string> }) => void }).plausible;
  if (typeof plausible === "function") {
    try {
      plausible(event, props ? { props } : undefined);
    } catch {
      // Analytics errors never break the UI.
    }
  }
}

/**
 * Region-aware pricing. First render matches SSR exactly (US resolution of
 * whatever tiers the server passed in), so React hydration is happy. On mount
 * we fetch /api/pricing which uses the cookie + geo header to serve tier
 * data for the caller's region, and the display swaps. Below-the-fold, so the
 * ~150ms swap is usually invisible.
 */
export default function Pricing({ tiers }: { tiers: PricingTier[] }) {
  const [billing, setBilling] = useState<Billing>("monthly");
  const annual = billing === "annual";

  // Seed with the SSR resolution so first client render === server render.
  const [resolved, setResolved] = useState<ResolvedTier[]>(() =>
    resolveTiersForRegion(tiers, DEFAULT_REGION),
  );
  const [region, setRegion] = useState<RegionCode>(DEFAULT_REGION);
  // Whatever the geo-detected region was, kept alongside the current pick so
  // we can emit `pricing_currency_mismatch` when they diverge.
  const autoRegion = useRef<RegionCode | null>(null);
  const reportedDetected = useRef(false);
  // /api/pricing is fetched on mount and again on every picker change, and the
  // responses can land out of order — only the newest request may write state,
  // or a slow mount fetch would overwrite the user's pick.
  const requestSeq = useRef(0);

  const loadRegion = useCallback(async () => {
    const seq = ++requestSeq.current;
    try {
      const res = await fetch("/api/pricing", { credentials: "same-origin" });
      if (!res.ok) return;
      const data = (await res.json()) as { region: RegionCode; tiers: ResolvedTier[] };
      if (seq !== requestSeq.current) return; // superseded — drop this response
      setResolved(data.tiers);
      setRegion(data.region);
      // Record the geo default the first time we see it; subsequent overrides
      // reuse this to spot mismatches.
      if (autoRegion.current === null) autoRegion.current = data.region;
      if (!reportedDetected.current) {
        reportedDetected.current = true;
        track("pricing_region_detected", { region: data.region });
      }
    } catch {
      // Network / edge failure — SSR default remains visible. Log once,
      // no UI change. The section is functional either way.
      console.warn("[pricing] /api/pricing fetch failed; using SSR default");
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount, not a synchronous setState: loadRegion only writes state
    // in its post-await continuation, which the lint rule can't see through.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRegion();
  }, [loadRegion]);

  const handlePickerChange = useCallback(
    (next: RegionCode | null) => {
      const from = region;
      // CurrencyPicker has already written the cookies; re-fetch resolves the
      // final region (geo when auto, user's pick otherwise).
      void loadRegion().then(() => {
        if (next !== null && next !== from) {
          track("pricing_region_overridden", { from, to: next });
          if (autoRegion.current && next !== autoRegion.current) {
            track("pricing_currency_mismatch", {
              auto: autoRegion.current,
              picked: next,
            });
          }
        }
      });
    },
    [region, loadRegion],
  );

  return (
    <Section id="pricing">
      {/* Header + currency picker share one row. On md+ the picker sits at the
          top-right of the section (Vercel/Stripe pattern); on mobile it stacks
          under the header so the small viewport keeps a single reading order. */}
      <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-10">
        <SectionHeader
          eyebrow="Engagement models"
          title="Pricing that scales with the stack."
          lede="Start on the platform, or bring us in to build. Transparent tiers, no glue-code tax."
        />
        <CurrencyPicker region={region} onChange={handlePickerChange} />
      </div>

      <Reveal className="mb-[34px] flex justify-center print:hidden">
        <div
          role="group"
          aria-label="Billing period"
          className="inline-flex border border-line-3 bg-surface"
        >
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            aria-pressed={!annual}
            className={`bill-btn${!annual ? " is-on" : ""}`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling("annual")}
            aria-pressed={annual}
            className={`bill-btn${annual ? " is-on" : ""}`}
          >
            Annual · save 2 mo
          </button>
        </div>
      </Reveal>

      {renderPricingRow(resolved, annual)}

      <PricingCompare
        tierNames={tierNamesOf(resolved)}
        onOpen={() => track("pricing_compare_opened")}
      />
    </Section>
  );
}

/**
 * Splits the resolved tiers into two visual groups and renders both:
 *
 *   - Subscription-style tiers (anything not custom-priced) in a 3-column row.
 *   - Custom-priced tiers (Studio today, but any tier with price === "Custom")
 *     as full-width banners underneath.
 *
 * The split is data-driven so the layout stays right if Sanity ever renames
 * Studio or adds another custom tier.
 */
function renderPricingRow(tiers: ResolvedTier[], annual: boolean) {
  const bespoke = tiers.filter((t) => t.price === "Custom");
  const primary = tiers.filter((t) => t.price !== "Custom");

  return (
    <div className="flex flex-col gap-[18px]">
      {primary.length > 0 ? (
        <div
          // items-stretch (default) + h-full on each card interior gives every
          // card in a row the same height as the tallest one; the inner flex
          // column pins the CTA at the bottom regardless of feature count.
          className={`grid grid-cols-1 gap-[18px] ${
            primary.length >= 3 ? "md:grid-cols-3" : "sm:grid-cols-2"
          }`}
        >
          {primary.map((tier, i) => (
            <Reveal key={tier.name} delay={i * 0.08} className="h-full">
              <PrimaryCard tier={tier} annual={annual} />
            </Reveal>
          ))}
        </div>
      ) : null}

      {bespoke.map((tier, i) => (
        <Reveal key={tier.name} delay={(primary.length + i) * 0.08}>
          <BespokeBanner tier={tier} annual={annual} />
        </Reveal>
      ))}
    </div>
  );
}

/**
 * Standard subscription-style pricing card.
 *
 * Layout order (Vercel pattern): name → blurb → price → features → CTA. The
 * features `ul` grows to fill (flex-1), so the CTA lands at the bottom of the
 * card at the same vertical position as every other CTA in the row.
 */
function PrimaryCard({ tier, annual }: { tier: ResolvedTier; annual: boolean }) {
  const price = annual && tier.annualPrice ? tier.annualPrice : tier.price;
  const ctaClass = tier.highlighted
    ? "mt-auto block bg-lime p-3 text-center text-[15px] font-semibold text-lime-ink transition-colors hover:bg-lime-hover hover:text-lime-ink"
    : "btn-outline mt-auto block p-3 text-center text-[15px] font-semibold";

  return (
    <div
      className={
        tier.highlighted
          ? "relative flex h-full flex-col border border-lime bg-surface-3 p-[30px] shadow-[0_0_0_1px_#C9F24D,0_20px_50px_rgba(0,0,0,.5)]"
          : "card flex h-full flex-col p-[30px] hover:border-lime-edge"
      }
    >
      {tier.badge ? (
        <div className="absolute top-5 right-5 bg-lime px-2.5 py-1 font-mono text-[10.5px] font-bold tracking-[0.12em] text-lime-ink uppercase">
          {tier.badge}
        </div>
      ) : null}

      <div className="mb-1.5 font-display text-[19px] font-semibold">{tier.name}</div>
      {/* min-h reserves two lines' worth of blurb so a one-line neighbour
          doesn't shrink and misalign the price row across cards. */}
      <div className="mb-[22px] min-h-[42px] text-[13.5px] text-t4">{tier.blurb}</div>

      {/* aria-live so a screen reader announces the currency swap when the user
          picks a region. Polite = wait for user idle, avoids reading over
          other content. */}
      <div className="mb-6" aria-live="polite">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-[clamp(34px,5vw,46px)] font-bold tracking-[-0.02em]">
            {price}
          </span>
          {tier.period ? <span className="text-sm text-t5">{tier.period}</span> : null}
        </div>
        {/* Reserved height so switching billing doesn't shift the card. */}
        {tier.annualNote ? (
          <div className="mt-[7px] h-3.5 font-mono text-[11px] tracking-[0.04em] text-lime">
            {annual ? tier.annualNote : ""}
          </div>
        ) : null}
        {tier.taxNote ? (
          <div className="mt-3 font-mono text-[11.5px] tracking-[0.04em] text-t5">
            {tier.taxNote}
          </div>
        ) : null}
        {tier.paymentNote ? (
          <div className="mt-1 font-mono text-[11.5px] tracking-[0.04em] text-t5">
            {tier.paymentNote}
          </div>
        ) : null}
      </div>

      {/* flex-1 pushes the CTA to the bottom of the card regardless of how many
          features this tier has. Cards in the same row therefore end with the
          CTA at the same vertical position — the whole point of the refactor. */}
      <ul className="m-0 mb-6 flex flex-1 list-none flex-col gap-3 p-0">
        {tier.features.map((feature) => (
          <li
            key={feature}
            className={`flex gap-2.5 text-[14.5px] ${
              tier.highlighted ? "text-t2" : "text-t3"
            }`}
          >
            <span className="text-lime">▸</span>
            {feature}
          </li>
        ))}
      </ul>

      {/* Purchasable tiers (a `checkout` block) go to their /pricing/[slug]
          inner page; everything else keeps the contact anchor. */}
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

/**
 * Wide banner for custom-priced tiers (Studio). Two-column on md+ so the
 * pitch and features can breathe horizontally; stacks vertically on mobile.
 * Same `card` surface as the primary cards so it reads as part of the family
 * rather than a foreign block.
 */
function BespokeBanner({ tier, annual }: { tier: ResolvedTier; annual: boolean }) {
  const price = annual && tier.annualPrice ? tier.annualPrice : tier.price;

  return (
    <div className="card grid grid-cols-1 gap-8 p-[30px] md:grid-cols-[1.4fr_1fr] md:items-center md:gap-12">
      <div>
        <div className="mb-1.5 font-display text-[19px] font-semibold">{tier.name}</div>
        <div className="mb-5 text-[13.5px] text-t4">{tier.blurb}</div>

        <ul className="m-0 grid list-none grid-cols-1 gap-x-6 gap-y-3 p-0 sm:grid-cols-2">
          {tier.features.map((feature) => (
            <li
              key={feature}
              className="flex gap-2.5 text-[14.5px] text-t3"
            >
              <span className="text-lime">▸</span>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <div
        className="flex flex-col gap-4 md:items-end md:text-right"
        aria-live="polite"
      >
        <div className="flex items-baseline gap-1.5 md:justify-end">
          <span className="font-display text-[clamp(30px,4vw,40px)] font-bold tracking-[-0.02em]">
            {price}
          </span>
          {tier.period ? <span className="text-sm text-t5">{tier.period}</span> : null}
        </div>
        {tier.taxNote ? (
          <div className="font-mono text-[11.5px] tracking-[0.04em] text-t5">
            {tier.taxNote}
          </div>
        ) : null}
        <a
          href="#contact"
          className="btn-outline mt-2 block px-6 py-3 text-center text-[15px] font-semibold md:self-end"
        >
          {tier.cta}
        </a>
      </div>
    </div>
  );
}
