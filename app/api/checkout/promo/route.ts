import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { chargeFor, purchasableTierBySlug } from "@/lib/pricing-amount";
import { evaluatePromo, normalizeCode, PROMO_MESSAGE } from "@/lib/promo";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import {
  COOKIE_REGION,
  DEFAULT_REGION,
  isRegionCode,
  regionFromCountry,
} from "@/lib/region";
import { getPricingTiers, getPromoCode } from "@/lib/sanity/queries";

export const runtime = "nodejs";

/**
 * Preview a promo code: "is this valid, and what does it take off?"
 *
 * This endpoint is a CONVENIENCE, not an authority. Nothing it returns is
 * trusted later — the order route looks the code up and evaluates it again from
 * scratch, because anything the browser sends can be edited. The two go through
 * the same `evaluatePromo`, so a code cannot preview one way here and behave
 * differently when the money moves.
 *
 * Rate limited on the same bucket as the order route: an un-limited "is this
 * code valid" endpoint is a code-guessing oracle.
 */
const bodySchema = z.object({
  code: z.string().min(1).max(64),
  tierSlug: z.string().min(1).max(64),
  billing: z.enum(["monthly", "annual"]),
});

export async function POST(request: Request) {
  const limit = rateLimit(clientIp(request));
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, message: "Too many attempts. Try again in a moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "That request wasn't readable." },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid request." },
      { status: 400 },
    );
  }

  // Same currency resolution the order route performs, so the discount shown is
  // the discount charged. Tax region is irrelevant here: the discount comes off
  // before tax, so it depends only on the net amount and its currency.
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieRegion = cookieStore.get(COOKIE_REGION)?.value;
  const geoCountry = headerStore.get("x-vercel-ip-country");
  const geoRegion = geoCountry ? regionFromCountry(geoCountry) : null;
  const region =
    (cookieRegion && isRegionCode(cookieRegion) ? cookieRegion : null) ??
    geoRegion ??
    DEFAULT_REGION;

  const tier = purchasableTierBySlug(await getPricingTiers(), parsed.data.tierSlug);
  const charge = tier && chargeFor(tier.checkout, parsed.data.billing, region);
  if (!tier || !charge) {
    return NextResponse.json(
      { ok: false, message: "That plan isn't available to buy online." },
      { status: 404 },
    );
  }

  const promo = await getPromoCode(parsed.data.code);
  const result = evaluatePromo(promo, {
    tierSlug: tier.checkout.slug,
    netMinor: charge.amountMinor,
    currency: charge.currency,
    now: new Date(),
  });

  if (!result.ok) {
    // 200, not 4xx: an invalid code is an ordinary answer to an ordinary
    // question, and the panel renders the message inline rather than as a
    // failure. The message is deliberately unspecific for the cases where
    // naming the reason would help someone probe for live codes.
    return NextResponse.json({ ok: false, message: PROMO_MESSAGE[result.reason] });
  }

  return NextResponse.json({
    ok: true,
    code: normalizeCode(result.code),
    discountMinor: result.discountMinor,
  });
}
