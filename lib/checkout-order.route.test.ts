import { afterEach, describe, expect, it, vi } from "vitest";
import { PRICING_TIERS } from "@/lib/content";

// Route handler test. Lives under lib/ to match the vitest include glob; it
// imports the App Router POST handler via the "@" alias.

vi.mock("server-only", () => ({}));

const scale = PRICING_TIERS.find((t) => t.name === "Scale")!;

// The CMS fetch and the Razorpay + config layers are mocked; the amount
// resolution under test (pricing-amount.ts) runs for real.
vi.mock("@/lib/sanity/queries", () => ({
  getPricingTiers: vi.fn(async () => [scale]),
  getPromoCode: vi.fn(async () => null),
}));
vi.mock("@/lib/razorpay-config", () => ({ isRazorpayConfigured: () => true }));
vi.mock("@/lib/rate-limit", () => ({
  clientIp: () => "test-ip",
  rateLimit: () => ({ ok: true }),
}));

const createOrderMock = vi.fn(
  async (input: { amountMinor: number; currency: string }) => ({
    ok: true as const,
    order: {
      id: "order_x",
      amount: input.amountMinor,
      currency: input.currency,
      status: "created",
    },
    keyId: "rzp_test_x",
  }),
);
vi.mock("@/lib/razorpay", () => ({
  createOrder: (input: { amountMinor: number; currency: string }) =>
    createOrderMock(input),
}));

// The route now reads the region from the pref_region cookie + the geo header —
// control both per test. Default (no cookie, no geo) → US default → INR base.
const cookieRegion = vi.fn((): string | undefined => undefined);
const geoCountry = vi.fn((): string | null => null);
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const v = name === "pref_region" ? cookieRegion() : undefined;
      return v ? { value: v } : undefined;
    },
  }),
  headers: async () => ({ get: () => geoCountry() }),
}));

import { getPricingTiers, getPromoCode } from "@/lib/sanity/queries";
import { POST } from "@/app/api/checkout/order/route";

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/checkout/order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

afterEach(() => {
  createOrderMock.mockClear();
  cookieRegion.mockReturnValue(undefined);
  geoCountry.mockReturnValue(null);
  vi.mocked(getPromoCode).mockResolvedValue(null);
});

/** A live 20%-off code, as the CMS would return it. */
const twentyOff = {
  code: "SPRINT20",
  kind: "percent" as const,
  percent: 20,
  active: true,
};

describe("POST /api/checkout/order", () => {
  it("charges the SERVER-resolved amount, ignoring any price the client sends", async () => {
    const res = await post({
      tierSlug: "scale",
      billing: "monthly",
      // Attacker-supplied fields — must be ignored entirely.
      amount: 1,
      amountMinor: 1,
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
    expect(createOrderMock).toHaveBeenCalledTimes(1);
    expect(createOrderMock.mock.calls[0][0].amountMinor).toBe(scale.checkout!.amountMinor);
    expect(createOrderMock.mock.calls[0][0].amountMinor).not.toBe(1);
  });

  it("uses the annual amount for annual billing", async () => {
    await post({ tierSlug: "scale", billing: "annual" });
    expect(createOrderMock.mock.calls[0][0].amountMinor).toBe(
      scale.checkout!.annualAmountMinor,
    );
  });

  it("creates the order in the region's currency when the cookie region has one", async () => {
    // A EU buyer with International Payments data → the order is EUR 54900, not INR.
    const intlScale = {
      ...scale,
      checkout: {
        ...scale.checkout!,
        regionalCharges: [
          { region: "EU" as const, currency: "EUR" as const, amountMinor: 54_900, annualAmountMinor: 54_900 },
        ],
      },
    };
    vi.mocked(getPricingTiers).mockResolvedValueOnce([intlScale]);
    cookieRegion.mockReturnValue("EU");

    await post({ tierSlug: "scale", billing: "monthly" });
    expect(createOrderMock.mock.calls[0][0]).toMatchObject({
      amountMinor: 54_900,
      currency: "EUR",
    });
  });

  it("charges GST on top for an IN buyer, and records the split on the order", async () => {
    cookieRegion.mockReturnValue("IN");
    await post({ tierSlug: "scale", billing: "monthly" });

    const net = scale.checkout!.amountMinor;
    const tax = Math.round((net * 1800) / 10_000);
    const call = createOrderMock.mock.calls[0][0] as {
      amountMinor: number;
      currency: string;
      notes?: Record<string, string>;
    };
    // The GROSS reaches Razorpay — charging net here would silently swallow the
    // 18% the panel told the buyer they were paying.
    expect(call.amountMinor).toBe(net + tax);
    expect(call.amountMinor).not.toBe(net);
    expect(call.currency).toBe("INR");
    expect(call.notes).toMatchObject({
      region: "IN",
      net_minor: String(net),
      tax_minor: String(tax),
      tax_label: "GST 18%",
    });
  });

  it("an IN buyer who picked USD still pays GST — currency is not place of supply", async () => {
    // The regression this guards: the region cookie is written by
    // CurrencyPicker, and it used to decide the tax region as well as the
    // charge currency while also outranking geo. So an Indian buyer could pick
    // "USD" on /#pricing and check out for $599 with no GST — an 18% leak
    // reachable from the UI. Currency follows the pick; tax follows geo.
    const intlScale = {
      ...scale,
      checkout: {
        ...scale.checkout!,
        regionalCharges: [
          { region: "US" as const, currency: "USD" as const, amountMinor: 59_900, annualAmountMinor: 59_900 },
        ],
      },
    };
    vi.mocked(getPricingTiers).mockResolvedValueOnce([intlScale]);
    cookieRegion.mockReturnValue("US"); // picked in the currency dropdown
    geoCountry.mockReturnValue("IN"); // actually sitting in India

    await post({ tierSlug: "scale", billing: "monthly" });
    const call = createOrderMock.mock.calls[0][0] as {
      amountMinor: number;
      currency: string;
      notes?: Record<string, string>;
    };
    // Charged in the currency they chose...
    expect(call.currency).toBe("USD");
    // ...but GST still applies, because they are in India.
    expect(call.notes).toMatchObject({ tax_label: "GST 18%", region: "IN" });
    expect(call.amountMinor).toBe(59_900 + Math.round((59_900 * 1800) / 10_000));
  });

  it("adds no tax for a non-IN buyer (export of services)", async () => {
    cookieRegion.mockReturnValue("UK");
    await post({ tierSlug: "scale", billing: "monthly" });
    const call = createOrderMock.mock.calls[0][0] as {
      amountMinor: number;
      notes?: Record<string, string>;
    };
    expect(call.amountMinor).toBe(scale.checkout!.amountMinor);
    expect(call.notes).toMatchObject({ tax_minor: "0", tax_label: "none" });
  });

  it("applies a promo code it looked up itself, and records the redemption", async () => {
    vi.mocked(getPromoCode).mockResolvedValueOnce(twentyOff);
    await post({ tierSlug: "scale", billing: "monthly", promoCode: "sprint20" });

    const net = scale.checkout!.amountMinor;
    const discount = Math.round((net * 2000) / 10_000);
    const call = createOrderMock.mock.calls[0][0] as {
      amountMinor: number;
      notes?: Record<string, string>;
    };
    expect(call.amountMinor).toBe(net - discount);
    expect(call.notes).toMatchObject({
      promo_code: "SPRINT20",
      discount_minor: String(discount),
    });
  });

  it("IGNORES a discount sent by the client — only the code is input", async () => {
    // The browser can edit anything it sends. `discountMinor` is not in the
    // route's schema at all, so a forged one cannot reach the charge, exactly
    // as a forged `amount` cannot. With no code, there is no discount.
    await post({
      tierSlug: "scale",
      billing: "monthly",
      discountMinor: 4_000_000,
      discount: 4_000_000,
    });
    const call = createOrderMock.mock.calls[0][0] as {
      amountMinor: number;
      notes?: Record<string, string>;
    };
    expect(call.amountMinor).toBe(scale.checkout!.amountMinor);
    expect(call.notes).toMatchObject({ promo_code: "none", discount_minor: "0" });
  });

  it("charges full price when the code is expired, rather than failing the order", async () => {
    vi.mocked(getPromoCode).mockResolvedValueOnce({
      ...twentyOff,
      expiresAt: "2020-01-01T00:00:00Z",
    });
    const res = await post({
      tierSlug: "scale",
      billing: "monthly",
      promoCode: "SPRINT20",
    });
    expect(res.status).toBe(200);
    const call = createOrderMock.mock.calls[0][0] as {
      amountMinor: number;
      notes?: Record<string, string>;
    };
    expect(call.amountMinor).toBe(scale.checkout!.amountMinor);
    expect(call.notes).toMatchObject({ promo_code: "none" });
  });

  it("discounts BEFORE tax for an IN buyer", async () => {
    vi.mocked(getPromoCode).mockResolvedValueOnce(twentyOff);
    geoCountry.mockReturnValue("IN");
    await post({ tierSlug: "scale", billing: "monthly", promoCode: "SPRINT20" });

    const net = scale.checkout!.amountMinor;
    const discount = Math.round((net * 2000) / 10_000);
    const taxable = net - discount;
    const tax = Math.round((taxable * 1800) / 10_000);
    const call = createOrderMock.mock.calls[0][0] as { amountMinor: number };
    // Taxing the list price and discounting after would over-collect GST on
    // money the customer never paid.
    expect(call.amountMinor).toBe(taxable + tax);
  });

  it("404s a non-purchasable tier and never creates an order", async () => {
    const res = await post({ tierSlug: "platform", billing: "monthly" });
    expect(res.status).toBe(404);
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it("400s an invalid billing period", async () => {
    const res = await post({ tierSlug: "scale", billing: "weekly" });
    expect(res.status).toBe(400);
    expect(createOrderMock).not.toHaveBeenCalled();
  });
});
