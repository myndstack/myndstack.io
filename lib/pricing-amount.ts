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

import type { PricingTier, RegionCode, TierCheckout } from "@/lib/content";

export type Billing = "monthly" | "annual";

/** Currencies we can charge in — INR base plus Razorpay International Payments. */
export type ChargeCurrency = "INR" | "USD" | "EUR" | "GBP";
const CHARGE_CURRENCIES: readonly ChargeCurrency[] = ["INR", "USD", "EUR", "GBP"];
const isChargeCurrency = (c: unknown): c is ChargeCurrency =>
  typeof c === "string" && (CHARGE_CURRENCIES as readonly string[]).includes(c);

/** A resolved charge, ready to hand to the order route. */
export type Charge = {
  /** Smallest currency unit (paise for INR, cents/pence otherwise). */
  amountMinor: number;
  currency: ChargeCurrency;
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
/**
 * The pure charge core — the SAME result on the server (order route) and the
 * client (checkout panel), so the shown price and the created order can never
 * differ. A region with a valid entry charges in that currency; anything
 * missing or malformed fails SAFE to the INR base — never a silent wrong
 * foreign charge. Returns null only if even the INR base is unusable.
 */
export function chargeFor(
  checkout: TierCheckout,
  billing: Billing,
  region?: RegionCode,
): Charge | null {
  if (region) {
    const rc = checkout.regionalCharges?.find((r) => r.region === region);
    if (rc) {
      const amt = billing === "annual" ? rc.annualAmountMinor : rc.amountMinor;
      if (Number.isSafeInteger(amt) && amt > 0 && isChargeCurrency(rc.currency)) {
        return { amountMinor: amt, currency: rc.currency };
      }
      // Malformed regional entry → fall through to the INR base below.
    }
  }
  const amountMinor =
    billing === "annual" ? checkout.annualAmountMinor : checkout.amountMinor;
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return null;
  return { amountMinor, currency: "INR" };
}

export function resolveCharge(
  tier: PricingTier,
  billing: Billing,
  region?: RegionCode,
): Charge | null {
  if (!isPurchasable(tier)) return null;
  return chargeFor(tier.checkout, billing, region);
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

const CHARGE_SYMBOL: Record<ChargeCurrency, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

/**
 * Format any charge for display. INR keeps Indian digit grouping (via
 * formatInrMinor); USD/EUR/GBP use a leading symbol with thousands grouping and
 * drop a trailing ".00" on whole amounts (€549, not €549.00). Deterministic — no
 * `toLocaleString` — so the server render and the client agree exactly, and the
 * button label always matches the amount the order route charges.
 */
export function formatChargeMinor(
  amountMinor: number,
  currency: ChargeCurrency,
): string {
  if (currency === "INR") return formatInrMinor(amountMinor);
  const major = Math.abs(amountMinor) / 100;
  const whole = amountMinor % 100 === 0;
  const s = whole ? String(Math.round(major)) : major.toFixed(2);
  const [int, dec] = s.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sign = amountMinor < 0 ? "-" : "";
  return `${sign}${CHARGE_SYMBOL[currency]}${grouped}${dec ? `.${dec}` : ""}`;
}
