import { describe, expect, it } from "vitest";
import { PRICING_TIERS, type PricingTier } from "./content";
import {
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
