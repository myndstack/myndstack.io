import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { getPricingTiers } from "@/lib/sanity/queries";
import {
  COOKIE_REGION,
  DEFAULT_REGION,
  isRegionCode,
  regionFromCountry,
  resolveTiersForRegion,
} from "@/lib/region";

export const runtime = "edge";
// The response body varies by cookie + geo, so we must not let a shared cache
// stash a single response. `private, no-store` keeps CDN/edge caches out of
// the loop; the client picker refetches on region change anyway.
export const dynamic = "force-dynamic";

/**
 * Serves the pricing tiers resolved to the caller's region. Client `<Pricing>`
 * calls this on mount and after picker changes; nothing else should.
 *
 * Precedence for the region:
 *   1. ?region=… override — dev/QA only, ignored in production.
 *   2. `pref_region` cookie (set by the picker or by middleware).
 *   3. `x-vercel-ip-country` geo header, mapped via COUNTRY_TO_REGION.
 *   4. DEFAULT_REGION ("US"). Matches SSR default so the swap is a no-op.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const debugOverride =
    process.env.NODE_ENV !== "production" ? url.searchParams.get("region") : null;

  const cookieStore = await cookies();
  const headerStore = await headers();

  const cookieRegion = cookieStore.get(COOKIE_REGION)?.value;
  // Trust boundary: `x-vercel-ip-country` is injected by Vercel's edge, but the
  // platform docs don't explicitly guarantee it strips a client-supplied
  // version — a determined caller could send this header themselves. Fine for
  // this endpoint (worst case: they see the wrong currency on the pricing
  // section, which the picker lets them override anyway). Do NOT treat this
  // value as authoritative for anything security-sensitive without adding a
  // strip-and-reinject step upstream.
  const geoRegion = regionFromCountry(headerStore.get("x-vercel-ip-country"));

  const region =
    (debugOverride && isRegionCode(debugOverride) ? debugOverride : null) ??
    (cookieRegion && isRegionCode(cookieRegion) ? cookieRegion : null) ??
    geoRegion ??
    DEFAULT_REGION;

  const tiers = await getPricingTiers();
  const resolved = resolveTiersForRegion(tiers, region);

  return NextResponse.json(
    { region, tiers: resolved },
    {
      headers: {
        "cache-control": "private, no-store",
        "x-region": region,
      },
    },
  );
}
