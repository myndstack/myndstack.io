import type { NextConfig } from "next";

/**
 * Sent on every response.
 *
 * These are the headers safe to apply blanket: they harden clickjacking,
 * MIME-sniffing, referrer leakage, and base-tag / plugin injection without
 * constraining scripts or styles. A script/style CSP is deliberately NOT here —
 * a nonce-based policy forces per-request rendering and would defeat this site's
 * static generation, and this app has no user-generated HTML sink to protect
 * (every `dangerouslySetInnerHTML` is static JSON-LD). See DEPLOYMENT.md.
 *
 * `includeSubDomains` on HSTS commits every *.myndstack.io host to HTTPS for the
 * max-age — fine as long as api.myndstack.io and friends are TLS, which they are.
 * `preload` is intentionally omitted: it is a hard-to-reverse browser-list entry.
 *
 * The Sanity Studio is NOT embedded in this app (see README / sanity.cli.ts), so
 * these headers apply cleanly to the whole site with nothing to carve out — the
 * editor lives at its own Sanity-hosted URL, not on this origin.
 */
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Content-Security-Policy",
    value: "base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self'",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /**
   * Local `npm run build` sets NEXT_DIST_DIR=.next-build so it can run alongside
   * the dev server without corrupting its chunks. Vercel builds to the default
   * `.next` (it runs plain `next build` with the var unset — see vercel.json),
   * which is the output layout its Next.js builder expects.
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",
  headers: async () => [
    {
      // Baseline security headers on every route.
      source: "/:path*",
      headers: SECURITY_HEADERS,
    },
    {
      /**
       * BIMI. Mail providers fetch this SVG from the URL in the DNS record
       * (`default._bimi.myndstack.io`), so the path and its caching have to stay
       * stable and long-lived — the asset is `public/bimi/myndstack-bimi.svg`.
       * (nosniff is already supplied by the baseline block above.)
       */
      source: "/bimi/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=604800, stale-while-revalidate=86400",
        },
      ],
    },
  ],
};

export default nextConfig;
