import Script from "next/script";

/**
 * Cookie-free, env-gated analytics. With NEXT_PUBLIC_PLAUSIBLE_DOMAIN unset —
 * including every local run — this renders nothing at all, so there is no
 * consent banner to manage and no script to block.
 *
 * To use Vercel Analytics instead: `npm i @vercel/analytics` and swap the body
 * for `<Analytics />` from `@vercel/analytics/next`.
 */
export default function Analytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;

  return (
    <Script
      defer
      strategy="afterInteractive"
      data-domain={domain}
      src="https://plausible.io/js/script.js"
    />
  );
}
