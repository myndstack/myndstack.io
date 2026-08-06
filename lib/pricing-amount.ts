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

/**
 * A resolved NET charge — the listed amount, before tax.
 *
 * This is not the number to charge. Statutory tax is added on top by
 * `breakdownFor`; hand Razorpay `ChargeBreakdown.grossMinor`.
 */
export type Charge = {
  /** Smallest currency unit (paise for INR, cents/pence otherwise). */
  amountMinor: number;
  currency: ChargeCurrency;
};

/**
 * Statutory tax added ON TOP of the listed amount, keyed by the buyer's region.
 *
 * The rate lives in code, not Sanity, on purpose. Everything else in this file
 * exists to stop a malformed CMS value becoming a real charge, and a rate is
 * the worst possible thing to leave editable as free text — "18" vs "0.18" vs
 * "18%" is the difference between a correct charge, no tax, and an 18× one. The
 * tax *copy* shown on the marketing cards is separately editable
 * (`regionalPrices[].taxNote`); this table is the arithmetic.
 *
 * Basis points, so the maths stays in integers and never touches a float.
 *
 * Only IN carries a rate. US/EU/UK are an export of services from India and are
 * zero-rated — that is a deliberate entry-shaped hole, not an oversight. Note
 * this keys on REGION (place of supply), not currency: a UK buyer whose
 * regional amount is malformed falls back to an INR charge in `chargeFor` and
 * still owes no GST, which is correct.
 */
const TAX_RULES: Partial<Record<RegionCode, { readonly bps: number; readonly label: string }>> = {
  IN: { bps: 1800, label: "GST 18%" },
};

/**
 * What the tax line is CALLED in each region, whether or not any is charged.
 *
 * Separate from TAX_RULES because a region can have a named tax and still add
 * nothing: an EU buyer's line is "VAT — none added", which is a more useful
 * statement than a generic "Tax", and it answers the "excl. VAT" the pricing
 * card showed them in the same words.
 *
 * Not a single label for all non-IN regions: the United States has no VAT at
 * all, so naming a US buyer's row "VAT" would be inventing a tax that does not
 * exist there. Sales tax is the US equivalent, and it is likewise not charged.
 */
const TAX_NAMES: Record<RegionCode, string> = {
  IN: "GST",
  EU: "VAT",
  UK: "VAT",
  US: "Sales tax",
};

/** A charge split into what is listed, what tax is added, and what is charged. */
export type ChargeBreakdown = {
  /** The listed amount, before any discount or tax. */
  netMinor: number;
  /**
   * Promo discount, in minor units. Subtracted from `netMinor` BEFORE tax is
   * worked out, because tax is owed on what the customer actually pays. Taxing
   * the list price and discounting afterwards would over-collect.
   */
  discountMinor: number;
  /** Tax added on top. 0 when the region has no rule. */
  taxMinor: number;
  /** net − discount + tax — the ONLY number that should reach Razorpay. */
  grossMinor: number;
  currency: ChargeCurrency;
  /** e.g. "GST 18%". Null when no tax was added, so the UI can skip the rows. */
  taxLabel: string | null;
  /**
   * What the tax is called here — "VAT", "GST", "Sales tax" — regardless of
   * whether any is charged. The UI names the row with this so a zero still says
   * WHICH tax is zero.
   */
  taxName: string;
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
 * The charge split into net / tax / gross — the shared core the checkout panel
 * and the order route BOTH run, so the price on screen, the button label and
 * the created order are one number even now that tax moves them apart.
 *
 * Fails safe toward the buyer: a region with no rule, a missing region, or
 * arithmetic that leaves safe-integer range all yield tax 0 and gross === net.
 * Under-collecting tax is the business's problem to reconcile; over-charging a
 * customer by a bad multiplication is not recoverable in the same way.
 */
export function breakdownFor(
  checkout: TierCheckout,
  billing: Billing,
  region?: RegionCode,
  /**
   * Place of supply — where the buyer actually IS. Separate from `region`,
   * which only picks the currency, because those are two different questions
   * and conflating them was a real hole: the region cookie is written by the
   * currency dropdown, so a buyer in India could select "USD" and the same
   * value that changed their currency also switched off their 18% GST.
   *
   * Currency is a preference. Place of supply is a fact. An Indian buyer paying
   * in dollars still owes GST; a UK buyer paying in rupees still owes none.
   *
   * Defaults to `region` so callers that genuinely have no better signal behave
   * as before — the order route passes geo here.
   */
  taxRegion: RegionCode | undefined = region,
  /**
   * Promo discount in minor units, already validated by lib/promo.ts. Clamped
   * here too rather than trusted: this function is the last thing between a
   * number and Razorpay, and a discount larger than the amount would produce a
   * negative charge.
   */
  discountMinor = 0,
): ChargeBreakdown | null {
  const charge = chargeFor(checkout, billing, region);
  if (!charge) return null;

  const taxName = taxRegion ? TAX_NAMES[taxRegion] : "Tax";

  const discount =
    Number.isSafeInteger(discountMinor) && discountMinor > 0
      ? Math.min(discountMinor, charge.amountMinor)
      : 0;
  // Tax is owed on what is actually paid, so the discount comes off first.
  const taxable = charge.amountMinor - discount;

  const untaxed: ChargeBreakdown = {
    netMinor: charge.amountMinor,
    discountMinor: discount,
    taxMinor: 0,
    grossMinor: taxable,
    currency: charge.currency,
    taxLabel: null,
    taxName,
  };

  const rule = taxRegion ? TAX_RULES[taxRegion] : undefined;
  if (!rule) return untaxed;

  // Integer maths: the taxable base and bps are both integers, so this is exact
  // for any realistic amount. Math.round only matters for a rate that doesn't
  // divide evenly (18% of a whole-rupee amount always does).
  const taxMinor = Math.round((taxable * rule.bps) / 10_000);
  const grossMinor = taxable + taxMinor;
  if (
    !Number.isSafeInteger(taxMinor) ||
    !Number.isSafeInteger(grossMinor) ||
    taxMinor < 0
  ) {
    return untaxed;
  }

  return {
    netMinor: charge.amountMinor,
    discountMinor: discount,
    taxMinor,
    grossMinor,
    currency: charge.currency,
    taxLabel: rule.label,
    taxName,
  };
}

/** `breakdownFor` against a whole tier; null when the tier isn't purchasable. */
export function resolveBreakdown(
  tier: PricingTier,
  billing: Billing,
  region?: RegionCode,
  taxRegion?: RegionCode,
  discountMinor = 0,
): ChargeBreakdown | null {
  if (!isPurchasable(tier)) return null;
  return breakdownFor(
    tier.checkout,
    billing,
    region,
    taxRegion ?? region,
    discountMinor,
  );
}

/**
 * Format an INR minor-unit amount (paise) with Indian digit grouping —
 * 19_900_000 → "₹1,99,000" (last three digits, then groups of two). Done by
 * hand rather than via `toLocaleString` so the output is deterministic and does
 * not depend on the runtime's ICU locale data.
 *
 * Paise are shown only when non-zero. Every listed amount is a whole number of
 * rupees, so this reads "₹49,999" exactly as it always did — but 18% GST is the
 * first thing on this site that produces a fraction, and the old
 * `Math.round(minor / 100)` would have printed "₹58,999" over a Razorpay modal
 * charging ₹58,998.82. A total that disagrees with the payment sheet by 18
 * paise is still a total that disagrees.
 */
export function formatInrMinor(amountMinor: number): string {
  const negative = amountMinor < 0;
  const abs = Math.abs(amountMinor);
  const rupees = Math.trunc(abs / 100);
  const paise = abs % 100;
  const digits = String(rupees);
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest
    ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}`
    : last3;
  const fraction = paise ? `.${String(paise).padStart(2, "0")}` : "";
  return `${negative ? "-₹" : "₹"}${grouped}${fraction}`;
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
