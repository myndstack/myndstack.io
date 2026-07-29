/**
 * Region detection + preference cookies.
 *
 * A "region" is a bucket the pricing surface understands (IN, US, EU, UK).
 * Countries map to buckets via COUNTRY_TO_REGION; anything not in that map
 * — the vast majority of the world — falls through to US/USD, which is what
 * SSR also renders. The safe default.
 *
 * Two cookies drive the behaviour:
 *   - pref_region:  the current bucket ("IN" | "US" | "EU" | "UK")
 *   - pref_source:  "user" if the visitor picked it explicitly. Present iff
 *                   the picker was used. Middleware never overwrites the
 *                   region cookie while this is set.
 *
 * Both are first-party, functional, 60-day, SameSite=Lax, Secure in prod.
 * See /cookies for the user-facing description.
 */

import type { PricingTier, RegionCode, RegionalPrice } from "@/lib/content";

export const REGION_CODES = ["IN", "US", "EU", "UK"] as const;
export const DEFAULT_REGION: RegionCode = "US";

export const COOKIE_REGION = "pref_region";
export const COOKIE_SOURCE = "pref_source";
export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 60; // 60 days

export const isRegionCode = (v: unknown): v is RegionCode =>
  typeof v === "string" && (REGION_CODES as readonly string[]).includes(v);

/**
 * ISO-3166-1 alpha-2 country code → region bucket. Only countries explicitly
 * mapped here get a non-default region; the fallback (US/USD) covers every
 * other market until we roll out APAC/ME buckets. EEA-30 (EU-27 + Iceland,
 * Liechtenstein, Norway) all map to EU so pricing + VAT copy are consistent
 * across the EEA. Switzerland is not EEA and stays on the default until it
 * gets its own bucket.
 */
export const COUNTRY_TO_REGION: Record<string, RegionCode> = {
  // India
  IN: "IN",

  // United Kingdom
  GB: "UK",

  // Eurozone (EU-27)
  AT: "EU", // Austria
  BE: "EU", // Belgium
  BG: "EU", // Bulgaria
  HR: "EU", // Croatia
  CY: "EU", // Cyprus
  CZ: "EU", // Czech Republic
  DK: "EU", // Denmark
  EE: "EU", // Estonia
  FI: "EU", // Finland
  FR: "EU", // France
  DE: "EU", // Germany
  GR: "EU", // Greece
  HU: "EU", // Hungary
  IE: "EU", // Ireland
  IT: "EU", // Italy
  LV: "EU", // Latvia
  LT: "EU", // Lithuania
  LU: "EU", // Luxembourg
  MT: "EU", // Malta
  NL: "EU", // Netherlands
  PL: "EU", // Poland
  PT: "EU", // Portugal
  RO: "EU", // Romania
  SK: "EU", // Slovakia
  SI: "EU", // Slovenia
  ES: "EU", // Spain
  SE: "EU", // Sweden

  // EEA non-EU
  IS: "EU", // Iceland
  LI: "EU", // Liechtenstein
  NO: "EU", // Norway

  // United States + Canada default to USD (Canada may split off later)
  US: "US",
  CA: "US",
};

export const regionFromCountry = (country: string | null | undefined): RegionCode => {
  if (!country) return DEFAULT_REGION;
  return COUNTRY_TO_REGION[country.toUpperCase()] ?? DEFAULT_REGION;
};

/**
 * Merge a tier's regional overlay onto its flat fields for the caller's region.
 * Fields on the overlay win; anything absent falls back to the flat value. The
 * returned tier has the same shape the existing UI already renders, plus
 * optional tax + payment notes when the overlay provides them.
 */
export type ResolvedTier = PricingTier & {
  taxNote?: string;
  paymentNote?: string;
  currency?: RegionalPrice["currency"];
  symbol?: RegionalPrice["symbol"];
};

export function resolveTierForRegion(
  tier: PricingTier,
  region: RegionCode,
): ResolvedTier {
  const overlay = tier.regionalPrices?.find((r) => r.region === region);
  if (!overlay) return tier;

  return {
    ...tier,
    price: overlay.price ?? tier.price,
    annualPrice: overlay.annualPrice ?? tier.annualPrice,
    period: overlay.period ?? tier.period,
    annualNote: overlay.annualNote ?? tier.annualNote,
    taxNote: overlay.taxNote,
    paymentNote: overlay.paymentNote,
    currency: overlay.currency,
    symbol: overlay.symbol,
  };
}

export const resolveTiersForRegion = (
  tiers: PricingTier[],
  region: RegionCode,
): ResolvedTier[] => tiers.map((t) => resolveTierForRegion(t, region));

/** Label + symbol pairs consumed by the currency picker. */
export const REGION_META: Record<RegionCode, { label: string; symbol: string; currency: string }> =
  {
    IN: { label: "India", symbol: "₹", currency: "INR" },
    US: { label: "United States", symbol: "$", currency: "USD" },
    EU: { label: "Eurozone", symbol: "€", currency: "EUR" },
    UK: { label: "United Kingdom", symbol: "£", currency: "GBP" },
  };
