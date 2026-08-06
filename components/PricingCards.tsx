"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { RegionCode } from "@/lib/content";
import { isPurchasable } from "@/lib/pricing-amount";
import { DEFAULT_REGION, type ResolvedTier } from "@/lib/region";
import CurrencyPicker from "./CurrencyPicker";
import Reveal from "./Reveal";

type Props = {
  /** Server-resolved to DEFAULT_REGION, so SSR and the first paint agree. */
  initialTiers: ResolvedTier[];
};

/**
 * Fetch the caller's region-resolved pricing. Module scope, and returns a plain
 * result rather than setting state — the same shape as CheckoutPanel's
 * `fetchRegions`, and for the same reason: a setState hidden behind a plain
 * function call is invisible to the effect lint rule, which then has to assume
 * the worst and flags the call site.
 *
 * Returns null on any failure, which callers read as "keep what we have" rather
 * than blanking the section.
 */
async function fetchRegionPricing(): Promise<
  { region: RegionCode; tiers: ResolvedTier[] } | null
> {
  try {
    const res = await fetch("/api/pricing", {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      region: RegionCode;
      tiers: ResolvedTier[];
    };
    return data?.tiers?.length ? data : null;
  } catch {
    // Network hiccup — the caller keeps the server-rendered default.
    return null;
  }
}

/**
 * Client layer of the Pricing section: the currency picker plus the tier cards.
 *
 * SSR renders the default-region (US) prices the server resolved — matching what
 * `/api/pricing` returns for a visitor with no cookie/geo, so US visitors never
 * see a swap. On mount, and after every picker change, this refetches
 * `/api/pricing` (which reads the geo header + `pref_region` cookie) and swaps
 * the prices in place. The page itself stays static; only that one API route is
 * dynamic. A failed fetch keeps the server-rendered prices rather than blanking.
 */
export default function PricingCards({ initialTiers }: Props) {
  const [region, setRegion] = useState<RegionCode>(DEFAULT_REGION);
  const [tiers, setTiers] = useState<ResolvedTier[]>(initialTiers);

  // Track mount for the handler below. The mount effect already uses a local
  // `live`; this ref covers `onPick`, which may resolve after the section is
  // gone (route change during the fetch).
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Sync to the visitor's real region once, after hydration. `live` guards the
  // unmount race — a response landing after the section has gone sets state on
  // the way out. The setState calls sit inside the async closure rather than
  // behind a plain call so the effect lint rule can see they are not
  // synchronous; same shape as CheckoutPanel.
  useEffect(() => {
    let live = true;
    void (async () => {
      const next = await fetchRegionPricing();
      if (!live || !next) return;
      setTiers(next.tiers);
      setRegion(next.region);
    })();
    return () => {
      live = false;
    };
  }, []);

  // An event handler, not an effect — a plain await reads fine here.
  const onPick = async (next: RegionCode | null) => {
    if (next) setRegion(next); // optimistic — the select reflects the pick at once
    // The picker already wrote the cookie; fetch that region's prices.
    const data = await fetchRegionPricing();
    if (!alive.current || !data) return;
    setTiers(data.tiers);
    setRegion(data.region);
  };

  return (
    <>
      <div className="mb-5 flex justify-end">
        <CurrencyPicker region={region} onChange={onPick} />
      </div>
      <div className="pricing-grid grid grid-cols-1 gap-[18px] md:grid-cols-3">
        {tiers.map((tier, i) => (
          <Reveal key={tier.name} delay={i * 0.08} className="h-full">
            <PricingCard tier={tier} />
          </Reveal>
        ))}
      </div>
    </>
  );
}

/**
 * "from ₹99,999" renders the leading "from" as a tiny mono micro-label so it
 * never competes with the amount; plain strings render whole and big.
 */
function Price({ price, period }: { price: string; period?: string }) {
  const from = /^from\s+/i.exec(price);
  const main = from ? price.slice(from[0].length) : price;
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      {from ? (
        <span className="font-mono text-[11px] font-medium tracking-[0.12em] text-t5 uppercase">
          from
        </span>
      ) : null}
      <span className="font-display text-[clamp(28px,4vw,38px)] font-bold leading-none tracking-[-0.02em]">
        {main}
      </span>
      {period ? <span className="text-[13px] text-t5">{period}</span> : null}
    </div>
  );
}

function PricingCard({ tier }: { tier: ResolvedTier }) {
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
        {/* Per-region note — e.g. "billed in USD" for US, "excl. GST 18%" for IN.
            Since International Payments shipped, the charge is in the shown
            currency, so this must NOT say "billed in INR" for a non-IN region.
            t5, not t6: t5 is the AA-safe floor for small text on these surfaces
            (the axe e2e guards exactly this). */}
        {tier.taxNote ? (
          <div className="mt-2 font-mono text-[11px] tracking-[0.04em] text-t5">
            {tier.taxNote}
          </div>
        ) : null}
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
