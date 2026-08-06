import { describe, expect, it } from "vitest";
import type { PricingTier } from "./content";
import { resolveBreakdown } from "./pricing-amount";
import {
  assertRedeemable,
  discountFor,
  evaluatePromo,
  normalizeCode,
  type PromoCode,
} from "./promo";

const NOW = new Date("2026-06-15T12:00:00Z");

const percent = (over: Partial<PromoCode> = {}): PromoCode => ({
  code: "SPRINT20",
  kind: "percent",
  percent: 20,
  active: true,
  ...over,
});

const fixed = (over: Partial<PromoCode> = {}): PromoCode => ({
  code: "FLAT5K",
  kind: "fixed",
  fixedAmounts: [
    { region: "IN", currency: "INR", amountMinor: 500_000 },
    { region: "UK", currency: "GBP", amountMinor: 5_000 },
  ],
  active: true,
  ...over,
});

describe("normalizeCode", () => {
  it("ignores case and surrounding space", () => {
    expect(normalizeCode("  sprint20 ")).toBe("SPRINT20");
  });
});

describe("assertRedeemable", () => {
  const ctx = { tierSlug: "discovery-sprint", now: NOW };

  it("passes a live, in-window, unrestricted code", () => {
    expect(assertRedeemable(percent(), ctx)).toBeNull();
  });

  it("rejects an unknown or switched-off code", () => {
    expect(assertRedeemable(null, ctx)).toBe("unknown");
    expect(assertRedeemable(undefined, ctx)).toBe("unknown");
    expect(assertRedeemable(percent({ active: false }), ctx)).toBe("inactive");
  });

  it("respects the start and end of the window", () => {
    expect(
      assertRedeemable(percent({ startsAt: "2026-07-01T00:00:00Z" }), ctx),
    ).toBe("not_started");
    expect(
      assertRedeemable(percent({ expiresAt: "2026-01-01T00:00:00Z" }), ctx),
    ).toBe("expired");
    // In-window on both sides.
    expect(
      assertRedeemable(
        percent({ startsAt: "2026-01-01T00:00:00Z", expiresAt: "2026-12-31T00:00:00Z" }),
        ctx,
      ),
    ).toBeNull();
  });

  it("treats an unreadable date as closed, not as unbounded", () => {
    // A typo in an expiry that silently meant "never expires" is the more
    // expensive mistake, so a date we cannot parse rejects the code and the
    // owner finds out immediately.
    expect(assertRedeemable(percent({ expiresAt: "not-a-date" }), ctx)).toBe(
      "expired",
    );
    expect(assertRedeemable(percent({ startsAt: "whenever" }), ctx)).toBe(
      "not_started",
    );
  });

  it("scopes to named tiers, and allows every tier when unset", () => {
    expect(assertRedeemable(percent({ tierSlugs: ["other-plan"] }), ctx)).toBe(
      "wrong_tier",
    );
    expect(
      assertRedeemable(percent({ tierSlugs: ["discovery-sprint"] }), ctx),
    ).toBeNull();
    expect(assertRedeemable(percent({ tierSlugs: [] }), ctx)).toBeNull();
  });
});

describe("discountFor", () => {
  it("takes a percentage in integer maths", () => {
    expect(discountFor(percent(), 4_999_900, "INR")).toBe(999_980);
    expect(discountFor(percent({ percent: 100 }), 4_999_900, "INR")).toBe(4_999_900);
  });

  it("takes a fixed amount only in a currency it defines", () => {
    expect(discountFor(fixed(), 4_999_900, "INR")).toBe(500_000);
    expect(discountFor(fixed(), 45_900, "GBP")).toBe(5_000);
    // A fixed discount cannot be converted — ₹5,000 off is not €5,000 off — so
    // a currency with no entry yields nothing rather than a guess.
    expect(discountFor(fixed(), 54_900, "EUR")).toBe(0);
  });

  it("never exceeds the amount being discounted", () => {
    // A ₹5,000 code against a ₹1,000 item must not produce a negative charge.
    expect(discountFor(fixed(), 100_000, "INR")).toBe(100_000);
  });

  it("yields nothing for a malformed code rather than a wrong charge", () => {
    expect(discountFor(percent({ percent: 0 }), 4_999_900, "INR")).toBe(0);
    expect(discountFor(percent({ percent: 150 }), 4_999_900, "INR")).toBe(0);
    expect(discountFor(percent({ percent: undefined }), 4_999_900, "INR")).toBe(0);
    expect(discountFor(fixed({ fixedAmounts: undefined }), 4_999_900, "INR")).toBe(0);
    expect(discountFor(percent(), 0, "INR")).toBe(0);
  });
});

describe("evaluatePromo", () => {
  const base = {
    tierSlug: "discovery-sprint",
    netMinor: 4_999_900,
    currency: "INR" as const,
    now: NOW,
  };

  it("returns the discount for a valid code", () => {
    expect(evaluatePromo(percent(), base)).toEqual({
      ok: true,
      code: "SPRINT20",
      discountMinor: 999_980,
    });
  });

  it("reports a code that resolves to nothing as a rejection, not a silent zero", () => {
    // Otherwise the buyer is told "applied" and sees no change in the price.
    expect(evaluatePromo(fixed(), { ...base, currency: "EUR", netMinor: 54_900 })).toEqual(
      { ok: false, reason: "no_discount_for_currency" },
    );
  });

  it("passes the gate rejection straight through", () => {
    expect(evaluatePromo(null, base)).toEqual({ ok: false, reason: "unknown" });
    expect(evaluatePromo(percent({ active: false }), base)).toEqual({
      ok: false,
      reason: "inactive",
    });
  });
});

/** The ordering that matters for money: discount first, then tax on the rest. */
describe("discount and tax together", () => {
  const tier: PricingTier = {
    name: "Regional",
    blurb: "x",
    price: "x",
    cta: "x",
    highlighted: false,
    features: ["x"],
    checkout: {
      slug: "regional",
      currency: "INR",
      amountMinor: 4_999_900,
      annualAmountMinor: 4_999_900,
    },
  };

  it("taxes the DISCOUNTED amount, not the list price", () => {
    // ₹49,999 − 20% = ₹39,999.20, and 18% GST of that is ₹7,199.86.
    // Taxing the list price first and discounting after would collect
    // ₹8,999.82 of GST on money the customer never paid.
    const b = resolveBreakdown(tier, "monthly", "IN", "IN", 999_980)!;
    expect(b.netMinor).toBe(4_999_900);
    expect(b.discountMinor).toBe(999_980);
    expect(b.taxMinor).toBe(719_986);
    expect(b.grossMinor).toBe(4_999_900 - 999_980 + 719_986);
  });

  it("discounts an untaxed region with no tax appearing", () => {
    const b = resolveBreakdown(tier, "monthly", "UK", "UK", 500_000)!;
    expect(b.discountMinor).toBe(500_000);
    expect(b.taxMinor).toBe(0);
    expect(b.grossMinor).toBe(4_999_900 - 500_000);
  });

  it("clamps a discount larger than the amount — never a negative charge", () => {
    const b = resolveBreakdown(tier, "monthly", "UK", "UK", 9_999_999)!;
    expect(b.discountMinor).toBe(4_999_900);
    expect(b.grossMinor).toBe(0);
  });

  it("ignores a malformed discount rather than charging on it", () => {
    for (const bad of [-100, 10.5, Number.NaN]) {
      const b = resolveBreakdown(tier, "monthly", "UK", "UK", bad)!;
      expect(b.discountMinor).toBe(0);
      expect(b.grossMinor).toBe(4_999_900);
    }
  });
});
