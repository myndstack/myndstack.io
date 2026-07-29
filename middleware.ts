import { NextResponse, type NextRequest } from "next/server";
import {
  COOKIE_MAX_AGE_SECONDS,
  COOKIE_REGION,
  COOKIE_SOURCE,
  DEFAULT_REGION,
  isRegionCode,
  regionFromCountry,
} from "@/lib/region";

/**
 * Edge middleware for region detection on the homepage.
 *
 * Runs only on `/` (matcher below) so the rest of the site — including all the
 * legal pages — pays no perf tax. The goal is exactly one small thing: on a
 * first visit, look at the Vercel geo header, pick a region bucket, and drop
 * a cookie that the /api/pricing route and the Pricing client can read later.
 *
 * User overrides always win: if `pref_region` is already set AND `pref_source`
 * says "user", the middleware doesn't touch anything. If the region cookie is
 * missing entirely, the middleware fills it in from geo (or from the default
 * when geo is unavailable, e.g. localhost or a non-Vercel host).
 *
 * An `x-region` request header is also set for the same request so downstream
 * handlers (currently only /api/pricing when called through a rewrite) can
 * read the resolved region without re-parsing.
 */
export function middleware(req: NextRequest) {
  const existingRegion = req.cookies.get(COOKIE_REGION)?.value;
  const isUserPick = req.cookies.get(COOKIE_SOURCE)?.value === "user";

  // Nothing to do — user has explicitly chosen, or the geo default already
  // landed on a valid region.
  if (existingRegion && isRegionCode(existingRegion) && isUserPick) {
    return NextResponse.next();
  }

  // Read geo. `x-vercel-ip-country` is the modern header; `req.geo` fills in
  // on older runtimes. Locally both are absent → fall back to default.
  const countryHeader = req.headers.get("x-vercel-ip-country");
  // `req.geo` was removed from the public type in Next 16 but is still present
  // on some Vercel edge runtimes; access via a cast avoids a build error while
  // keeping the fallback.
  const countryFromGeo =
    (req as unknown as { geo?: { country?: string } }).geo?.country ?? null;
  const region = regionFromCountry(countryHeader ?? countryFromGeo);

  // Skip write when the cookie already matches the geo pick (no-op path avoids
  // unnecessary Set-Cookie churn on every homepage hit).
  if (existingRegion === region) {
    const passthrough = NextResponse.next();
    passthrough.headers.set("x-region", region);
    return passthrough;
  }

  const res = NextResponse.next();
  res.cookies.set({
    name: COOKIE_REGION,
    value: region,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    // Not httpOnly — the client picker needs to read + write this cookie.
  });
  res.headers.set("x-region", region);
  return res;
}

// Homepage only. All other routes (legal pages, /work, /careers, API routes)
// skip middleware entirely — the cookie set here persists across the whole
// site so they don't need a re-check on every hit.
export const config = {
  matcher: ["/"],
};

// Re-export so a Node import doesn't fail on tree-shaken build metadata.
export const _defaultRegion = DEFAULT_REGION;
