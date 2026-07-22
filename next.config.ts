import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /**
   * `next build` and `next dev` both write to `.next`, so building while the dev
   * server is running corrupts it — the browser starts 404ing on main-app.js.
   * `npm run build` sets NEXT_DIST_DIR so the two never share a directory.
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",
  headers: async () => [
    {
      /**
       * BIMI. Mail providers fetch this SVG from the URL in the DNS record
       * (`default._bimi.myndstack.io`), so the path and its headers have to stay
       * stable and long-lived — the asset is `public/bimi/myndstack-bimi.svg`.
       */
      source: "/bimi/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=604800, stale-while-revalidate=86400",
        },
        { key: "X-Content-Type-Options", value: "nosniff" },
      ],
    },
  ],
};

export default nextConfig;
