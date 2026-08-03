/**
 * Pure helpers for turning a pricing tier into a chargeable amount.
 *
 * The single rule this file exists to enforce: **money comes only from the
 * numeric `checkout` amounts, never from the display `price` strings.** The
 * strings are marketing copy ("$2,400", "Custom", "₹1,99,000") and are chosen
 * for how they read, not for arithmetic. Every function here is pure and
 * unit-tested (pricing-amount.test.ts) so the amount that reaches Razorpay is
 * derived deterministically and fails closed on any malformed input.
 */

import type { PricingTier, TierCheckout } from "@/lib/content";

export type Billing = "monthly" | "annual";

/** A resolved charge, ready to hand to the order route. */
export type Charge = {
  /** Smallest currency unit (paise for INR). */
  amountMinor: number;
  currency: TierCheckout["currency"];
};

/** A tier is purchasable via self-serve checkout iff it carries checkout data. */
export function isPurchasable(
  tier: PricingTier,
): tier is PricingTier & { checkout: TierCheckout } {
  return tier.checkout != null;
}

/** Find a purchasable tier by its checkout slug, or null. */
export function purchasableTierBySlug(
  tiers: readonly PricingTier[],
  slug: string,
): (PricingTier & { checkout: TierCheckout }) | null {
  if (!slug) return null;
  const tier = tiers.find((t) => isPurchasable(t) && t.checkout.slug === slug);
  return tier && isPurchasable(tier) ? tier : null;
}

/**
 * The authoritative charge for a (tier, billing), or null when the tier is not
 * purchasable. Guards that the amount is a positive safe integer so a malformed
 * CMS value (0, negative, fractional, NaN) fails closed to null rather than
 * becoming a real, wrong charge.
 */
export function resolveCharge(tier: PricingTier, billing: Billing): Charge | null {
  if (!isPurchasable(tier)) return null;
  const amountMinor =
    billing === "annual"
      ? tier.checkout.annualAmountMinor
      : tier.checkout.amountMinor;
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return null;
  return { amountMinor, currency: tier.checkout.currency };
}

/**
 * Format an INR minor-unit amount (paise) with Indian digit grouping —
 * 19_900_000 → "₹1,99,000" (last three digits, then groups of two). Used for
 * the "billed in INR (~₹X)" note shown to non-IN buyers who pay in INR. Done by
 * hand rather than via `toLocaleString` so the output is deterministic and does
 * not depend on the runtime's ICU locale data.
 */
export function formatInrMinor(amountMinor: number): string {
  const rupees = Math.round(amountMinor / 100);
  const digits = String(Math.abs(rupees));
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest
    ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}`
    : last3;
  return `${rupees < 0 ? "-₹" : "₹"}${grouped}`;
}
