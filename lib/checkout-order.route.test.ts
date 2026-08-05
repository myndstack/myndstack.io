import { afterEach, describe, expect, it, vi } from "vitest";
import { PRICING_TIERS } from "@/lib/content";

// Route handler test. Lives under lib/ to match the vitest include glob; it
// imports the App Router POST handler via the "@" alias.

vi.mock("server-only", () => ({}));

const scale = PRICING_TIERS.find((t) => t.name === "Scale")!;

// The CMS fetch and the Razorpay + config layers are mocked; the amount
// resolution under test (pricing-amount.ts) runs for real.
vi.mock("@/lib/sanity/queries", () => ({ getPricingTiers: vi.fn(async () => [scale]) }));
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

import { getPricingTiers } from "@/lib/sanity/queries";
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
});

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
