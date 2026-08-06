import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  chargeFor,
  purchasableTierBySlug,
  resolveBreakdown,
} from "@/lib/pricing-amount";
import { evaluatePromo, normalizeCode } from "@/lib/promo";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createOrder } from "@/lib/razorpay";
import { isRazorpayConfigured } from "@/lib/razorpay-config";
import {
  COOKIE_REGION,
  DEFAULT_REGION,
  isRegionCode,
  regionFromCountry,
} from "@/lib/region";
import { getPricingTiers, getPromoCode } from "@/lib/sanity/queries";

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
  /**
   * The CODE only — never a discount amount. The server looks it up and
   * evaluates it again from scratch; a `discountMinor` sent from the browser is
   * not in this schema and so cannot reach the charge, for exactly the reason
   * an `amount` cannot.
   */
  promoCode: z.string().min(1).max(64).optional(),
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

  // Resolve the region the SAME way /api/pricing does — the picker's cookie,
  // then geo, then the default — so the charge currency matches the price the
  // buyer was shown. A missing/malformed regional amount fails safe to INR
  // inside chargeFor; it can never become a wrong foreign charge.
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieRegion = cookieStore.get(COOKIE_REGION)?.value;

  // Read the header raw rather than through regionFromCountry, which folds a
  // missing country into DEFAULT_REGION — that would make "no geo available"
  // indistinguishable from "genuinely in the US", and an Indian buyer on a
  // deploy without the header would silently lose their GST.
  const geoCountry = headerStore.get("x-vercel-ip-country");
  const geoRegion = geoCountry ? regionFromCountry(geoCountry) : null;

  // CURRENCY: the buyer's own pick wins. That is what the dropdown is for.
  const region =
    (cookieRegion && isRegionCode(cookieRegion) ? cookieRegion : null) ??
    geoRegion ??
    DEFAULT_REGION;

  // PLACE OF SUPPLY: geo, and only geo, whenever we have it. A dropdown cannot
  // move a buyer to another country. Before this split, one value drove both,
  // so picking "USD" on /#pricing switched off an Indian buyer's 18% GST — an
  // 18% leak reachable from the UI, no tampering required.
  //
  // Caveat, unchanged by this: `x-vercel-ip-country` is not authoritative
  // against a caller who forges it (see the note in /api/pricing). This closes
  // the accidental path, not header spoofing — that needs a strip-and-reinject
  // upstream, which is infrastructure rather than code.
  const taxRegion = geoRegion ?? region;

  if (!tier) {
    return NextResponse.json(
      { ok: false, error: "That plan isn't available to buy online." },
      { status: 404 },
    );
  }

  /**
   * Re-evaluate the promo HERE, from the code alone. The panel already previewed
   * it, but that answer reached us via the browser and is therefore a
   * suggestion. Same `evaluatePromo` the preview route runs, so the two cannot
   * disagree about what a code is worth.
   *
   * An invalid code yields no discount rather than failing the order. By this
   * point the buyer has committed to the gesture, and a code that expired
   * between preview and slide should charge the honest full price rather than
   * dead-end them — Razorpay's sheet restates the amount before any money moves.
   */
  const netForPromo = chargeFor(tier.checkout, parsed.data.billing, region);
  let discountMinor = 0;
  let appliedCode: string | null = null;
  if (parsed.data.promoCode && netForPromo) {
    const result = evaluatePromo(await getPromoCode(parsed.data.promoCode), {
      tierSlug: tier.checkout.slug,
      netMinor: netForPromo.amountMinor,
      currency: netForPromo.currency,
      now: new Date(),
    });
    if (result.ok) {
      discountMinor = result.discountMinor;
      appliedCode = normalizeCode(result.code);
    }
  }

  // The breakdown, not the bare charge: the discount comes off first, then
  // statutory tax (GST for IN) on what remains — by the SAME pure function the
  // panel renders from, so the total on screen and the order amount cannot
  // drift apart.
  const charge = resolveBreakdown(
    tier,
    parsed.data.billing,
    region,
    taxRegion,
    discountMinor,
  );
  if (!charge) {
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
    // grossMinor — net plus tax. Never charge `netMinor`.
    amountMinor: charge.grossMinor,
    currency: charge.currency,
    receipt,
    // The split rides along on the order so the tax on any payment can be
    // reconciled from Razorpay alone, without re-deriving it from the CMS
    // amounts as they stood on the day. Notes are strings.
    notes: {
      tier: tier.name,
      slug: tier.checkout.slug,
      billing: parsed.data.billing,
      // `region` is the PLACE OF SUPPLY — the one that justifies the tax line,
      // and so the one an auditor needs. The currency choice is recorded
      // separately; the two differ whenever a buyer picks a foreign currency.
      region: taxRegion,
      currency_region: region,
      net_minor: String(charge.netMinor),
      // The redemption record. Written here, on the payment itself, so usage
      // can be counted from Razorpay alone — and so a counter added later can
      // be backfilled from real history rather than starting at zero.
      promo_code: appliedCode ?? "none",
      discount_minor: String(charge.discountMinor),
      tax_minor: String(charge.taxMinor),
      tax_label: charge.taxLabel ?? "none",
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
