import { NextResponse } from "next/server";
import { z } from "zod";

import { purchasableTierBySlug, resolveCharge } from "@/lib/pricing-amount";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createOrder } from "@/lib/razorpay";
import { isRazorpayConfigured } from "@/lib/razorpay-config";
import { getPricingTiers } from "@/lib/sanity/queries";

// node runtime: lib/razorpay uses node:crypto + Basic auth. Not edge.
export const runtime = "nodejs";

/**
 * The client sends only WHICH tier and billing period it wants — never a price.
 * The amount is resolved here from the pricing data, so a tampered request can
 * change what you buy but never what it costs. Any `amount` a caller includes is
 * ignored (it is not in the schema).
 */
const bodySchema = z.object({
  tierSlug: z.string().min(1).max(64),
  billing: z.enum(["monthly", "annual"]),
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

  // Resolve the tier + charge from the CMS, server-side. Only tiers carrying a
  // `checkout` block are purchasable; everything else 404s here.
  const tiers = await getPricingTiers();
  const tier = purchasableTierBySlug(tiers, parsed.data.tierSlug);
  const charge = tier && resolveCharge(tier, parsed.data.billing);
  if (!tier || !charge) {
    return NextResponse.json(
      { ok: false, error: "That plan isn't available to buy online." },
      { status: 404 },
    );
  }

  const receipt = `ms_${tier.checkout.slug}_${parsed.data.billing}_${Date.now().toString(36)}`.slice(
    0,
    40,
  );
  const result = await createOrder({
    amountMinor: charge.amountMinor,
    currency: charge.currency,
    receipt,
    notes: {
      tier: tier.name,
      slug: tier.checkout.slug,
      billing: parsed.data.billing,
    },
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }

  // The public key id goes to the browser to open Checkout; the secret stays here.
  return NextResponse.json({
    ok: true,
    orderId: result.order.id,
    amount: result.order.amount,
    currency: result.order.currency,
    keyId: result.keyId,
    tierName: tier.name,
    billing: parsed.data.billing,
  });
}
