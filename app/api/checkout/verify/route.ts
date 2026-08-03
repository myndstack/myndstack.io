import { NextResponse } from "next/server";
import { z } from "zod";

import { clientIp, rateLimit } from "@/lib/rate-limit";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { isRazorpayConfigured } from "@/lib/razorpay-config";

export const runtime = "nodejs";

/**
 * Confirms a Checkout success payload came from Razorpay before the UI shows a
 * success state. This is a UX gate — the authoritative fulfilment signal is the
 * signed webhook (server-to-server), which cannot be skipped by a client that
 * simply never calls this. A failed signature is a plain 400.
 */
const bodySchema = z.object({
  orderId: z.string().min(1).max(64),
  paymentId: z.string().min(1).max(64),
  signature: z.string().min(1).max(256),
});

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = rateLimit(ip);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Try again in a moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "That request wasn't readable." },
      { status: 400 },
    );
  }

  if (!isRazorpayConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Online payment isn't available right now." },
      { status: 503 },
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (!verifyPaymentSignature(parsed.data)) {
    return NextResponse.json(
      { ok: false, error: "We couldn't verify that payment." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
