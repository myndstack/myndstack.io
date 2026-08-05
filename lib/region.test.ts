import { describe, expect, it } from "vitest";
import type { PricingTier } from "./content";
import {
  COUNTRY_TO_REGION,
  DEFAULT_REGION,
  REGION_CODES,
  isRegionCode,
  regionFromCountry,
  resolveTierForRegion,
} from "./region";

describe("regionFromCountry", () => {
  it("maps India to IN", () => {
    expect(regionFromCountry("IN")).toBe("IN");
  });

  it("maps GB to UK", () => {
    expect(regionFromCountry("GB")).toBe("UK");
  });

  it("maps every EEA-30 country to EU", () => {
    const eea = [
      // EU-27
      "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
      "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
      "PL", "PT", "RO", "SK", "SI", "ES", "SE",
      // EEA non-EU
      "IS", "LI", "NO",
    ];
    // EEA-30 sanity check — every code in the list has to land on EU. If a
    // future refactor drops one silently, this fails and names it.
    for (const code of eea) {
      expect(regionFromCountry(code)).toBe("EU");
    }
    expect(eea.length).toBe(30);
  });

  it("maps US + CA to US bucket", () => {
    expect(regionFromCountry("US")).toBe("US");
    expect(regionFromCountry("CA")).toBe("US");
  });

  it("falls back to default for unknown or empty countries", () => {
    expect(regionFromCountry("XX")).toBe(DEFAULT_REGION);
    expect(regionFromCountry("")).toBe(DEFAULT_REGION);
    expect(regionFromCountry(null)).toBe(DEFAULT_REGION);
    expect(regionFromCountry(undefined)).toBe(DEFAULT_REGION);
  });

  it("routes other Americas + rest of world to the USD default", () => {
    // Product contract: only IN, UK and the EEA get their own currency. Every
    // other market — the rest of the Americas, APAC, the Middle East, Africa,
    // and Switzerland (which is NOT in the EEA) — resolves to the USD default.
    for (const code of ["MX", "BR", "AR", "CL", "AU", "JP", "SG", "AE", "ZA", "CN", "CH"]) {
      expect(regionFromCountry(code)).toBe(DEFAULT_REGION);
    }
    expect(DEFAULT_REGION).toBe("US");
  });

  it("is case-insensitive on input", () => {
    expect(regionFromCountry("in")).toBe("IN");
    expect(regionFromCountry("gB")).toBe("UK");
  });

  it("keeps DEFAULT_REGION in sync with COUNTRY_TO_REGION", () => {
    // If the default isn't a valid RegionCode, half the runtime falls apart.
    expect(REGION_CODES).toContain(DEFAULT_REGION);
    for (const bucket of Object.values(COUNTRY_TO_REGION)) {
      expect(REGION_CODES).toContain(bucket);
    }
  });
});

describe("isRegionCode", () => {
  it("accepts the four known codes and nothing else", () => {
    for (const code of REGION_CODES) {
      expect(isRegionCode(code)).toBe(true);
    }
    for (const bad of ["ru", "in", "XX", "", null, undefined, 42, {}]) {
      expect(isRegionCode(bad)).toBe(false);
    }
  });

  // The CurrencyPicker <select> renders its `value` prop directly with no
  // local hydration state, so `<Pricing>`'s initial `useState(DEFAULT_REGION)`
  // has to produce a value that matches an <option> — otherwise the first
  // client render diverges from SSR and React drops hydration on the subtree.
  // Freezing that contract here so a future rename of DEFAULT_REGION can't
  // silently unpin the picker.
  it("DEFAULT_REGION is a valid RegionCode (SSR ↔ hydration contract)", () => {
    expect(isRegionCode(DEFAULT_REGION)).toBe(true);
    expect(REGION_CODES).toContain(DEFAULT_REGION);
  });
});

describe("resolveTierForRegion", () => {
  const baseTier: PricingTier = {
    name: "Scale",
    blurb: "test",
    price: "$2,400",
    annualPrice: "$2,000",
    period: "/ mo",
    annualNote: "billed annually",
    cta: "Start",
    highlighted: true,
    features: ["one"],
    regionalPrices: [
      {
        region: "IN",
        currency: "INR",
        symbol: "₹",
        price: "₹1,99,000",
        annualPrice: "₹1,65,000",
        period: "/ mo",
        annualNote: "billed annually · excl. GST",
        taxNote: "excl. GST 18%",
        paymentNote: "UPI · cards",
      },
    ],
  };

  it("overlays region-specific fields when present", () => {
    const out = resolveTierForRegion(baseTier, "IN");
    expect(out.price).toBe("₹1,99,000");
    expect(out.annualPrice).toBe("₹1,65,000");
    expect(out.taxNote).toBe("excl. GST 18%");
    expect(out.paymentNote).toBe("UPI · cards");
    expect(out.currency).toBe("INR");
    expect(out.symbol).toBe("₹");
    // Fields that stay the same (name, blurb, features) survive intact.
    expect(out.name).toBe("Scale");
    expect(out.features).toEqual(["one"]);
  });

  it("falls back to the tier's flat fields when no overlay for the region", () => {
    const out = resolveTierForRegion(baseTier, "EU");
    expect(out.price).toBe("$2,400");
    expect(out.annualPrice).toBe("$2,000");
    // No overlay → no notes and no currency/symbol.
    expect(out.taxNote).toBeUndefined();
    expect(out.paymentNote).toBeUndefined();
    expect(out.currency).toBeUndefined();
  });

  it("falls back cleanly when regionalPrices is absent entirely", () => {
    const noOverlay: PricingTier = { ...baseTier, regionalPrices: undefined };
    const out = resolveTierForRegion(noOverlay, "IN");
    expect(out.price).toBe("$2,400");
    expect(out.taxNote).toBeUndefined();
  });

  it("uses overlay taxNote even when the number is unchanged (e.g. Studio 'Custom')", () => {
    const customTier: PricingTier = {
      ...baseTier,
      price: "Custom",
      annualPrice: undefined,
      regionalPrices: [
        {
          region: "UK",
          currency: "GBP",
          symbol: "£",
          price: "Custom",
          taxNote: "excl. VAT",
        },
      ],
    };
    const out = resolveTierForRegion(customTier, "UK");
    expect(out.price).toBe("Custom");
    expect(out.taxNote).toBe("excl. VAT");
    expect(out.paymentNote).toBeUndefined();
  });
});
