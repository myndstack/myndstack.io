import { describe, expect, it } from "vitest";
import { PRICING_TIERS, type PricingTier } from "./content";
import {
  formatChargeMinor,
  formatInrMinor,
  isPurchasable,
  purchasableTierBySlug,
  resolveCharge,
} from "./pricing-amount";

const scale = PRICING_TIERS.find((t) => t.name === "Scale")!;
const platform = PRICING_TIERS.find((t) => t.name === "Platform")!;

/** A synthetic purchasable tier with a deliberately malformed amount. */
const malformed = (amountMinor: number, annualAmountMinor = 100): PricingTier => ({
  name: "Broken",
  blurb: "x",
  price: "x",
  cta: "x",
  highlighted: false,
  features: ["x"],
  checkout: { slug: "broken", currency: "INR", amountMinor, annualAmountMinor },
});

describe("isPurchasable", () => {
  it("is true only for tiers carrying checkout data", () => {
    expect(isPurchasable(scale)).toBe(true);
    expect(isPurchasable(platform)).toBe(false);
    for (const t of PRICING_TIERS) {
      expect(isPurchasable(t)).toBe(t.name === "Scale");
    }
  });
});

describe("purchasableTierBySlug", () => {
  it("finds a purchasable tier by its checkout slug", () => {
    expect(purchasableTierBySlug(PRICING_TIERS, "scale")?.name).toBe("Scale");
  });

  it("returns null for an unknown or non-purchasable slug", () => {
    expect(purchasableTierBySlug(PRICING_TIERS, "platform")).toBeNull();
    expect(purchasableTierBySlug(PRICING_TIERS, "nope")).toBeNull();
    expect(purchasableTierBySlug(PRICING_TIERS, "")).toBeNull();
  });
});

describe("resolveCharge", () => {
  it("returns the monthly INR amount for monthly billing", () => {
    expect(resolveCharge(scale, "monthly")).toEqual({
      amountMinor: scale.checkout!.amountMinor,
      currency: "INR",
    });
  });

  it("returns the annual INR amount for annual billing", () => {
    expect(resolveCharge(scale, "annual")).toEqual({
      amountMinor: scale.checkout!.annualAmountMinor,
      currency: "INR",
    });
  });

  it("returns null for a non-purchasable tier", () => {
    expect(resolveCharge(platform, "monthly")).toBeNull();
    expect(resolveCharge(platform, "annual")).toBeNull();
  });

  it("never yields a zero, negative, fractional, or NaN charge", () => {
    // A malformed CMS value must fail closed to null, not become a real charge.
    expect(resolveCharge(malformed(0), "monthly")).toBeNull();
    expect(resolveCharge(malformed(-100), "monthly")).toBeNull();
    expect(resolveCharge(malformed(10.5), "monthly")).toBeNull();
    expect(resolveCharge(malformed(Number.NaN), "monthly")).toBeNull();
    // ...including via the annual branch.
    expect(resolveCharge(malformed(100, 0), "annual")).toBeNull();
    expect(resolveCharge(malformed(100, -1), "annual")).toBeNull();
  });
});

describe("formatInrMinor", () => {
  it("formats paise with Indian digit grouping", () => {
    expect(formatInrMinor(19_900_000)).toBe("₹1,99,000");
    expect(formatInrMinor(198_000_000)).toBe("₹19,80,000");
    expect(formatInrMinor(500_000)).toBe("₹5,000");
    expect(formatInrMinor(90_000)).toBe("₹900");
    expect(formatInrMinor(900)).toBe("₹9");
    expect(formatInrMinor(0)).toBe("₹0");
  });
});

/** A purchasable tier with region charges, incl. a deliberately-broken UK one. */
const regionalTier: PricingTier = {
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
    regionalCharges: [
      { region: "EU", currency: "EUR", amountMinor: 54_900, annualAmountMinor: 54_900 },
      { region: "US", currency: "USD", amountMinor: 59_900, annualAmountMinor: 59_900 },
      // Malformed on purpose — must never become a £0 charge.
      { region: "UK", currency: "GBP", amountMinor: 0, annualAmountMinor: 0 },
    ],
  },
};

describe("resolveCharge — regional (International Payments)", () => {
  it("charges in the region's currency + amount when present", () => {
    expect(resolveCharge(regionalTier, "monthly", "EU")).toEqual({ amountMinor: 54_900, currency: "EUR" });
    expect(resolveCharge(regionalTier, "monthly", "US")).toEqual({ amountMinor: 59_900, currency: "USD" });
    expect(resolveCharge(regionalTier, "annual", "EU")).toEqual({ amountMinor: 54_900, currency: "EUR" });
  });

  it("falls back to the INR base for a region with no entry (IN here)", () => {
    expect(resolveCharge(regionalTier, "monthly", "IN")).toEqual({ amountMinor: 4_999_900, currency: "INR" });
  });

  it("fails SAFE to the INR base on a malformed regional amount — never a bad foreign charge", () => {
    // UK's amount is 0 → must charge the INR base, not £0.
    expect(resolveCharge(regionalTier, "monthly", "UK")).toEqual({ amountMinor: 4_999_900, currency: "INR" });
  });

  it("charges INR when no region is given (backward compatible)", () => {
    expect(resolveCharge(regionalTier, "monthly")).toEqual({ amountMinor: 4_999_900, currency: "INR" });
  });
});

describe("formatChargeMinor", () => {
  it("formats foreign currencies with symbol + thousands, dropping .00", () => {
    expect(formatChargeMinor(54_900, "EUR")).toBe("€549");
    expect(formatChargeMinor(59_900, "USD")).toBe("$599");
    expect(formatChargeMinor(45_900, "GBP")).toBe("£459");
    expect(formatChargeMinor(129_900, "USD")).toBe("$1,299");
    expect(formatChargeMinor(1_234_567, "USD")).toBe("$12,345.67");
  });

  it("shows cents only when present", () => {
    expect(formatChargeMinor(54_950, "EUR")).toBe("€549.50");
  });

  it("keeps Indian grouping for INR", () => {
    expect(formatChargeMinor(4_999_900, "INR")).toBe("₹49,999");
  });
});
