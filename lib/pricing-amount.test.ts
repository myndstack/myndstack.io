import { describe, expect, it } from "vitest";
import { PRICING_TIERS, type PricingTier } from "./content";
import {
  formatChargeMinor,
  formatInrMinor,
  isPurchasable,
  purchasableTierBySlug,
  resolveBreakdown,
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

  it("shows paise only when the amount actually has them (GST totals do)", () => {
    // The displayed total must equal the charge to the paise — the old
    // round-to-rupees printed ₹58,999 over a ₹58,998.82 Razorpay sheet.
    expect(formatInrMinor(5_899_882)).toBe("₹58,998.82");
    expect(formatInrMinor(899_982)).toBe("₹8,999.82");
    // A single-digit paise value keeps its leading zero.
    expect(formatInrMinor(100_005)).toBe("₹1,000.05");
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

describe("resolveBreakdown — statutory tax", () => {
  it("adds 18% GST on top for an IN buyer", () => {
    expect(resolveBreakdown(regionalTier, "monthly", "IN")).toEqual({
      netMinor: 4_999_900,
      discountMinor: 0,
      taxMinor: 899_982,
      grossMinor: 5_899_882,
      currency: "INR",
      taxLabel: "GST 18%",
      taxName: "GST",
    });
  });

  it("names the tax per region even when none is charged", () => {
    // A zero should still say WHICH tax is zero. "VAT" for an EU/UK buyer
    // matches the "excl. VAT" their pricing card showed; the US has no VAT at
    // all, so naming its row "VAT" would invent a tax that does not exist there.
    for (const [region, expected] of [
      ["EU", "VAT"],
      ["UK", "VAT"],
      ["US", "Sales tax"],
      ["IN", "GST"],
    ] as const) {
      expect(resolveBreakdown(regionalTier, "monthly", region)?.taxName).toBe(
        expected,
      );
    }
  });

  it("adds nothing for export-of-services regions, in their own currency", () => {
    for (const [region, amountMinor, currency, taxName] of [
      ["EU", 54_900, "EUR", "VAT"],
      ["US", 59_900, "USD", "Sales tax"],
    ] as const) {
      expect(resolveBreakdown(regionalTier, "monthly", region)).toEqual({
        netMinor: amountMinor,
        discountMinor: 0,
        taxMinor: 0,
        grossMinor: amountMinor,
        currency,
        taxLabel: null,
        taxName,
      });
    }
  });

  it("taxes the INR fallback for IN even though IN has no regional entry", () => {
    // IN falls back to the INR base inside chargeFor; the tax rule keys on
    // region, so it still applies to whatever amount won.
    const b = resolveBreakdown(regionalTier, "annual", "IN")!;
    expect(b.netMinor).toBe(4_999_900);
    expect(b.grossMinor).toBe(5_899_882);
  });

  it("does NOT tax a UK buyer who fell back to an INR charge", () => {
    // UK's regional amount is malformed → INR base. Place of supply is still
    // the UK, so an INR-denominated charge must not pick up GST.
    expect(resolveBreakdown(regionalTier, "monthly", "UK")).toEqual({
      netMinor: 4_999_900,
      discountMinor: 0,
      taxMinor: 0,
      grossMinor: 4_999_900,
      currency: "INR",
      taxLabel: null,
      taxName: "VAT",
    });
  });

  it("takes currency from `region` and tax from `taxRegion`, independently", () => {
    // Currency is a preference; place of supply is a fact. An Indian buyer who
    // picks USD pays in USD AND pays GST.
    expect(resolveBreakdown(regionalTier, "monthly", "US", "IN")).toEqual({
      netMinor: 59_900,
      discountMinor: 0,
      taxMinor: 10_782,
      grossMinor: 70_682,
      currency: "USD",
      taxLabel: "GST 18%",
      taxName: "GST",
    });
    // And the mirror: a UK buyer who picks INR pays in INR and owes nothing.
    expect(resolveBreakdown(regionalTier, "monthly", "IN", "UK")).toEqual({
      netMinor: 4_999_900,
      discountMinor: 0,
      taxMinor: 0,
      grossMinor: 4_999_900,
      currency: "INR",
      taxLabel: null,
      taxName: "VAT",
    });
  });

  it("adds no tax when no region is resolved — fails safe, never guesses", () => {
    expect(resolveBreakdown(regionalTier, "monthly")).toMatchObject({
      taxMinor: 0,
      grossMinor: 4_999_900,
      taxLabel: null,
    });
  });

  it("is null wherever resolveCharge is null — a bad amount never grows tax", () => {
    expect(resolveBreakdown(platform, "monthly", "IN")).toBeNull();
    expect(resolveBreakdown(malformed(0), "monthly", "IN")).toBeNull();
    expect(resolveBreakdown(malformed(-100), "monthly", "IN")).toBeNull();
    expect(resolveBreakdown(malformed(Number.NaN), "monthly", "IN")).toBeNull();
  });

  it("keeps gross === net + tax exactly, in integers", () => {
    for (const region of ["IN", "US", "EU", "UK"] as const) {
      const b = resolveBreakdown(regionalTier, "monthly", region)!;
      expect(b.grossMinor).toBe(b.netMinor + b.taxMinor);
      expect(Number.isSafeInteger(b.grossMinor)).toBe(true);
      expect(Number.isSafeInteger(b.taxMinor)).toBe(true);
    }
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
