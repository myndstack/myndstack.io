/**
 * Promo codes: the pure logic.
 *
 * Razorpay has no customer-typed coupon in the Orders + Checkout.js flow this
 * site uses — its "Offers" are dashboard-configured and keyed to payment
 * methods, not to a code a buyer types. So the discount is ours to compute, and
 * Razorpay simply charges the number we hand it. That makes this file part of
 * the money path, and it follows the same rules as pricing-amount.ts: pure,
 * integer-only, unit-tested, and it fails CLOSED on anything malformed.
 *
 * Two invariants worth stating outright:
 *
 *  1. **Discount is applied BEFORE tax.** GST is owed on what the customer
 *     actually pays, not on the list price. Taxing first and discounting after
 *     would over-collect. The ordering lives in `breakdownFor`.
 *  2. **A discount is never larger than the amount.** Clamped, so no arithmetic
 *     path can produce a negative total for Razorpay to reject — or worse,
 *     accept.
 */

import type { RegionCode } from "@/lib/content";
import type { ChargeCurrency } from "@/lib/pricing-amount";

export type PromoKind = "percent" | "fixed";

/** A fixed discount is per-currency: ₹5,000 off is not £5,000 off. */
export type PromoFixedAmount = {
  readonly region: RegionCode;
  readonly currency: ChargeCurrency;
  readonly amountMinor: number;
};

export type PromoCode = {
  readonly code: string;
  /** Internal note for the owner — never shown to a buyer. */
  readonly label?: string;
  readonly kind: PromoKind;
  /** 1–100. Used when kind is "percent". */
  readonly percent?: number;
  /** Used when kind is "fixed". */
  readonly fixedAmounts?: readonly PromoFixedAmount[];
  readonly active: boolean;
  /** ISO timestamps. Absent means "no bound on that side". */
  readonly startsAt?: string;
  readonly expiresAt?: string;
  /** Checkout slugs this applies to. Absent or empty means every tier. */
  readonly tierSlugs?: readonly string[];
  /**
   * DECLARED BUT NOT ENFORCED — deliberately.
   *
   * Enforcing either needs state this project does not have. A global cap needs
   * an ATOMIC counter, and Sanity is a CMS: two checkouts a second apart would
   * both read "9 used" and both succeed. A per-customer cap additionally needs
   * an identity we do not hold at this point in the flow — Razorpay collects
   * the buyer's email inside its own modal, after the order already exists.
   *
   * They are modelled now so that adding a key-value store later is an edit to
   * `assertRedeemable` and nothing else, rather than a content migration. Every
   * redemption is already recorded on the Razorpay order, so a counter added
   * later can be backfilled from real history.
   */
  readonly maxRedemptions?: number;
  readonly maxPerCustomer?: number;
};

export type PromoRejection =
  | "unknown"
  | "inactive"
  | "not_started"
  | "expired"
  | "wrong_tier"
  | "no_discount_for_currency";

/** What a buyer is told. Deliberately vague about WHY a code is invalid: an
 *  exact reason turns the field into an oracle for probing codes. Only the
 *  timing cases, which a holder of a real code needs to understand, are named. */
export const PROMO_MESSAGE: Record<PromoRejection, string> = {
  unknown: "That code isn't valid.",
  inactive: "That code isn't valid.",
  not_started: "That code isn't active yet.",
  expired: "That code has expired.",
  wrong_tier: "That code doesn't apply to this plan.",
  no_discount_for_currency: "That code isn't available in this currency.",
};

export type PromoEvaluation =
  | { readonly ok: true; readonly code: string; readonly discountMinor: number }
  | { readonly ok: false; readonly reason: PromoRejection };

/** Codes are matched case- and whitespace-insensitively. */
export const normalizeCode = (raw: string): string => raw.trim().toUpperCase();

/**
 * A date bound that is present but unparseable fails CLOSED — the code is
 * rejected rather than treated as unbounded. A typo in an expiry that silently
 * meant "never expires" is the more expensive mistake of the two; this way the
 * owner notices immediately because the code stops working.
 */
const parsed = (iso: string | undefined): number | null => {
  if (iso === undefined) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? Number.NaN : ms;
};

/**
 * THE SEAM. Every reason a code may not be used lives here, and nowhere else.
 *
 * Usage caps plug in at this function when there is a store to count in — the
 * callers, the routes and the UI all stay as they are.
 */
export function assertRedeemable(
  promo: PromoCode | null | undefined,
  ctx: { readonly tierSlug: string; readonly now: Date },
): PromoRejection | null {
  if (!promo) return "unknown";
  if (!promo.active) return "inactive";

  const now = ctx.now.getTime();

  const starts = parsed(promo.startsAt);
  if (starts !== null && (Number.isNaN(starts) || now < starts)) {
    return "not_started";
  }

  const expires = parsed(promo.expiresAt);
  if (expires !== null && (Number.isNaN(expires) || now >= expires)) {
    return "expired";
  }

  if (promo.tierSlugs?.length && !promo.tierSlugs.includes(ctx.tierSlug)) {
    return "wrong_tier";
  }

  return null;
}

/**
 * The discount in minor units, clamped to [0, netMinor]. Integer throughout —
 * percent is converted to basis points first so the maths never touches a
 * float, exactly as the tax rates do.
 *
 * Returns 0 for anything malformed rather than throwing: a bad CMS value should
 * mean "no discount", never a wrong charge.
 */
export function discountFor(
  promo: PromoCode,
  netMinor: number,
  currency: ChargeCurrency,
): number {
  if (!Number.isSafeInteger(netMinor) || netMinor <= 0) return 0;

  let raw = 0;
  if (promo.kind === "percent") {
    const percent = promo.percent;
    if (typeof percent !== "number" || !(percent > 0) || percent > 100) return 0;
    const bps = Math.round(percent * 100);
    raw = Math.round((netMinor * bps) / 10_000);
  } else {
    const entry = promo.fixedAmounts?.find((a) => a.currency === currency);
    if (!entry || !Number.isSafeInteger(entry.amountMinor)) return 0;
    raw = entry.amountMinor;
  }

  if (!Number.isSafeInteger(raw) || raw <= 0) return 0;
  // Never more than the thing being discounted.
  return Math.min(raw, netMinor);
}

/**
 * Gate + maths in one call, for the two places that need it: the preview route
 * and the order route. Both go through this so a code can never validate in the
 * panel and behave differently when the money moves.
 */
export function evaluatePromo(
  promo: PromoCode | null | undefined,
  ctx: {
    readonly tierSlug: string;
    readonly netMinor: number;
    readonly currency: ChargeCurrency;
    readonly now: Date;
  },
): PromoEvaluation {
  const rejection = assertRedeemable(promo, { tierSlug: ctx.tierSlug, now: ctx.now });
  if (rejection) return { ok: false, reason: rejection };

  const discountMinor = discountFor(promo!, ctx.netMinor, ctx.currency);
  // A code that resolves to nothing in this currency is a rejection, not a
  // silent zero — otherwise the buyer sees "applied" and no change in price.
  if (discountMinor <= 0) return { ok: false, reason: "no_discount_for_currency" };

  return { ok: true, code: promo!.code, discountMinor };
}
