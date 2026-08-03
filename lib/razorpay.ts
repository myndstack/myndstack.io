import "server-only";
import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";

import { resolveRazorpayStatus } from "./razorpay-config";

/**
 * Razorpay server-side primitives: create an order, and verify the two
 * signatures Razorpay hands us (the Checkout success payload and the webhook).
 *
 * Deliberately no `razorpay` SDK — the Orders API is one authenticated POST and
 * both signatures are HMAC-SHA256, so `fetch` + `node:crypto` cover it without a
 * dependency, matching how Turnstile was done. `server-only`: the key secret and
 * webhook secret must never reach the client bundle.
 *
 * Fail-closed everywhere: unconfigured, a bad amount, a non-200, a timeout, or a
 * mismatched signature all deny — an unverified payment is never a success.
 */

const ORDERS_URL = "https://api.razorpay.com/v1/orders";

/** A hung Razorpay must not hold a checkout request open indefinitely. */
const TIMEOUT_MS = 8_000;

export type CreateOrderInput = {
  /** Smallest currency unit (paise). Resolved server-side; never from the client. */
  readonly amountMinor: number;
  readonly currency: "INR";
  /** ≤ 40 chars per Razorpay; a human-traceable reference for the dashboard. */
  readonly receipt: string;
  readonly notes?: Readonly<Record<string, string>>;
};

/** The subset of the Razorpay order object we rely on, typed explicitly. */
export type RazorpayOrder = {
  readonly id: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: string;
};

export type CreateOrderResult =
  | { ok: true; order: RazorpayOrder; keyId: string }
  | { ok: false; error: string };

/**
 * Create a Razorpay order. The amount is trusted only from the caller (which
 * resolves it server-side from the pricing data) — and re-guarded here as a
 * positive safe integer so a bad value can never become a live charge.
 */
export async function createOrder(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const status = resolveRazorpayStatus();
  if (status.state !== "ready") {
    console.error("Razorpay is not configured — refusing to create an order.");
    return { ok: false, error: "Payments are not configured." };
  }
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    return { ok: false, error: "Invalid amount." };
  }

  const auth = Buffer.from(`${status.keyId}:${status.keySecret}`).toString(
    "base64",
  );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(ORDERS_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: input.amountMinor,
        currency: input.currency,
        receipt: input.receipt,
        notes: input.notes,
        payment_capture: 1,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.error("Razorpay order creation failed:", res.status);
      return { ok: false, error: "Could not start the payment." };
    }

    const order = (await res.json()) as RazorpayOrder;
    if (!order || typeof order.id !== "string" || !order.id) {
      return { ok: false, error: "Could not start the payment." };
    }
    return { ok: true, order, keyId: status.keyId };
  } catch {
    // Timeout (abort) or network error — not a started payment.
    return { ok: false, error: "Could not start the payment." };
  } finally {
    clearTimeout(timer);
  }
}

/** Constant-time compare of an expected HMAC-SHA256 hex against a provided one. */
function hmacHexEquals(
  secret: string,
  payload: string,
  provided: string,
): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  // timingSafeEqual throws on length mismatch — check first so a wrong-length
  // signature is a plain `false`, not an exception.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Verify a Checkout success payload: HMAC-SHA256(`order_id|payment_id`) keyed by
 * the key secret must equal `razorpay_signature`. Fails closed if unconfigured
 * or any field is missing.
 */
export function verifyPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const status = resolveRazorpayStatus();
  if (status.state !== "ready") return false;
  if (!input.orderId || !input.paymentId || !input.signature) return false;
  return hmacHexEquals(
    status.keySecret,
    `${input.orderId}|${input.paymentId}`,
    input.signature,
  );
}

/**
 * Verify a webhook delivery: HMAC-SHA256(rawBody) keyed by the webhook secret
 * must equal the `X-Razorpay-Signature` header. Fails closed if no webhook
 * secret is set (so an unconfigured webhook route rejects everything) or the
 * signature is absent. Pass the EXACT raw request body — not a re-serialized
 * object — or the HMAC will not match.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
): boolean {
  const status = resolveRazorpayStatus();
  if (status.state !== "ready" || !status.webhookSecret) return false;
  if (!signature) return false;
  return hmacHexEquals(status.webhookSecret, rawBody, signature);
}
