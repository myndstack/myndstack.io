import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Route handler test for the webhook. Uses the REAL signature verification
// (lib/razorpay + lib/razorpay-config) against stubbed env; only mail is mocked.

vi.mock("server-only", () => ({}));

const sendFormMailMock = vi.fn(async (_mail: unknown) => ({ ok: true }));
vi.mock("@/lib/mail", () => ({
  sendFormMail: (mail: unknown) => sendFormMailMock(mail),
}));

import { POST } from "@/app/api/razorpay/webhook/route";

const WEBHOOK_SECRET = "whsecret";

const sign = (secret: string, payload: string) =>
  createHmac("sha256", secret).update(payload).digest("hex");

const post = (raw: string, signature: string) =>
  POST(
    new Request("http://localhost/api/razorpay/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": signature,
      },
      body: raw,
    }),
  );

beforeEach(() => {
  vi.stubEnv("RAZORPAY_KEY_ID", "rzp_test_key");
  vi.stubEnv("RAZORPAY_KEY_SECRET", "keysecret");
  vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", WEBHOOK_SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
  sendFormMailMock.mockClear();
});

const captured = JSON.stringify({
  event: "payment.captured",
  payload: {
    payment: {
      entity: {
        id: "pay_1",
        order_id: "order_1",
        amount: 19_900_000,
        notes: { tier: "Scale", billing: "monthly" },
      },
    },
  },
});

describe("POST /api/razorpay/webhook", () => {
  it("rejects a forged signature with 400 and never emails", async () => {
    const res = await post(captured, "deadbeef");
    expect(res.status).toBe(400);
    expect(sendFormMailMock).not.toHaveBeenCalled();
  });

  it("rejects a signature over a tampered body (replay with edited amount)", async () => {
    const tampered = captured.replace("19900000", "1");
    // Signature is valid for the ORIGINAL body only.
    const res = await post(tampered, sign(WEBHOOK_SECRET, captured));
    expect(res.status).toBe(400);
    expect(sendFormMailMock).not.toHaveBeenCalled();
  });

  it("accepts a valid signature on a handled event and notifies once", async () => {
    const res = await post(captured, sign(WEBHOOK_SECRET, captured));
    expect(res.status).toBe(200);
    expect(sendFormMailMock).toHaveBeenCalledTimes(1);
  });

  it("acks a validly-signed but unhandled event without emailing", async () => {
    const other = JSON.stringify({ event: "payment.failed", payload: {} });
    const res = await post(other, sign(WEBHOOK_SECRET, other));
    expect(res.status).toBe(200);
    expect(sendFormMailMock).not.toHaveBeenCalled();
  });
});
