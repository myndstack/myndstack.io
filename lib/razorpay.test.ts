import { Buffer } from "node:buffer";
import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The module is `server-only`; stub that marker so it imports under vitest.
vi.mock("server-only", () => ({}));

import {
  createOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "./razorpay";

const KEY_ID = "rzp_test_key";
const KEY_SECRET = "keysecret";
const WEBHOOK_SECRET = "whsecret";

const sign = (secret: string, payload: string) =>
  createHmac("sha256", secret).update(payload).digest("hex");

beforeEach(() => {
  vi.stubEnv("RAZORPAY_KEY_ID", KEY_ID);
  vi.stubEnv("RAZORPAY_KEY_SECRET", KEY_SECRET);
  vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", WEBHOOK_SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("verifyPaymentSignature", () => {
  const orderId = "order_1";
  const paymentId = "pay_1";
  const good = sign(KEY_SECRET, `${orderId}|${paymentId}`);

  it("accepts a correct signature", () => {
    expect(verifyPaymentSignature({ orderId, paymentId, signature: good })).toBe(true);
  });

  it("rejects a tampered signature, order id, or payment id", () => {
    expect(verifyPaymentSignature({ orderId, paymentId, signature: `${good}0` })).toBe(
      false,
    );
    expect(
      verifyPaymentSignature({ orderId: "order_2", paymentId, signature: good }),
    ).toBe(false);
    expect(
      verifyPaymentSignature({ orderId, paymentId: "pay_2", signature: good }),
    ).toBe(false);
  });

  it("rejects any missing field", () => {
    expect(verifyPaymentSignature({ orderId: "", paymentId, signature: good })).toBe(
      false,
    );
    expect(verifyPaymentSignature({ orderId, paymentId: "", signature: good })).toBe(
      false,
    );
    expect(verifyPaymentSignature({ orderId, paymentId, signature: "" })).toBe(false);
  });

  it("fails closed when unconfigured", () => {
    vi.stubEnv("RAZORPAY_KEY_SECRET", "");
    expect(verifyPaymentSignature({ orderId, paymentId, signature: good })).toBe(false);
  });
});

describe("verifyWebhookSignature", () => {
  const raw = JSON.stringify({ event: "payment.captured", n: 1 });

  it("accepts a correct signature over the exact raw body", () => {
    expect(verifyWebhookSignature(raw, sign(WEBHOOK_SECRET, raw))).toBe(true);
  });

  it("rejects when the body differs by even one byte", () => {
    expect(verifyWebhookSignature(`${raw} `, sign(WEBHOOK_SECRET, raw))).toBe(false);
  });

  it("rejects a signature made with the key secret instead of the webhook secret", () => {
    expect(verifyWebhookSignature(raw, sign(KEY_SECRET, raw))).toBe(false);
  });

  it("fails closed when no webhook secret is set", () => {
    vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", "");
    expect(verifyWebhookSignature(raw, sign(WEBHOOK_SECRET, raw))).toBe(false);
  });
});

describe("createOrder", () => {
  const input = {
    amountMinor: 19_900_000,
    currency: "INR" as const,
    receipt: "ms_scale_monthly_1",
  };

  it("posts to Razorpay with Basic auth + the given amount, and returns order + keyId", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: "order_x",
            amount: input.amountMinor,
            currency: "INR",
            status: "created",
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await createOrder(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.order.id).toBe("order_x");
      expect(result.keyId).toBe(KEY_ID);
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url)).toContain("api.razorpay.com/v1/orders");
    const authHeader = (init.headers as Record<string, string>).Authorization;
    expect(authHeader.startsWith("Basic ")).toBe(true);
    expect(Buffer.from(authHeader.slice(6), "base64").toString("utf8")).toBe(
      `${KEY_ID}:${KEY_SECRET}`,
    );
    const body = JSON.parse(init.body as string) as { amount: number; currency: string };
    expect(body.amount).toBe(input.amountMinor);
    expect(body.currency).toBe("INR");
  });

  it("never calls Razorpay for a non-positive or fractional amount", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await createOrder({ ...input, amountMinor: 0 })).ok).toBe(false);
    expect((await createOrder({ ...input, amountMinor: -1 })).ok).toBe(false);
    expect((await createOrder({ ...input, amountMinor: 10.5 })).ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails closed on a non-200 from Razorpay", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("bad", { status: 401 })));
    expect((await createOrder(input)).ok).toBe(false);
  });

  it("fails closed on a network error / timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("aborted");
      }),
    );
    expect((await createOrder(input)).ok).toBe(false);
  });

  it("fails closed when unconfigured, without calling fetch", async () => {
    vi.stubEnv("RAZORPAY_KEY_ID", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await createOrder(input)).ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
