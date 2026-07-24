import "server-only";

import { apiVersion, dataset, projectId } from "@/sanity/env";

/**
 * The read layer, server-only — deliberately built on the **native `fetch`**,
 * not `@sanity/client`.
 *
 * This is the whole reason CMS edits reach the live site. Next.js only caches
 * and tags requests that go through its instrumented `fetch`; `@sanity/client`
 * uses its own HTTP layer (`get-it`) and quietly ignores `next: { tags,
 * revalidate }`, so with it a `revalidateTag` — from the webhook AND the timed
 * floor — has nothing to purge and statically generated pages stay frozen until
 * a redeploy. (It looked fine in dev, which doesn't cache.) Hitting Sanity's
 * documented HTTP query API with the native fetch puts every read in Next's data
 * cache with its tag, so revalidation actually works.
 *
 * `api.sanity.io` (not `apicdn`) so a revalidated refetch is fresh, not up to a
 * minute stale. The dataset is public, so no token is required; a token is used
 * automatically if present (drafts, higher rate limits). `perspective=published`
 * keeps drafts off the live site.
 */

const token = process.env.SANITY_API_READ_TOKEN;

/** Sanity's query endpoint. `api`, not `apicdn`, for fresh reads on revalidation. */
const QUERY_URL = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}`;

/**
 * Read Sanity fresh on every request — no Next data cache.
 *
 * This site's content pages render dynamically rather than as ISR. We tried the
 * cached-with-tags approach (revalidate + `revalidateTag` from a webhook) and it
 * worked in the build but NOT on the deployment: Vercel never regenerated the
 * prerendered pages (the `age` header climbed indefinitely and edits never
 * surfaced, tag- or time-based). Fetching uncached sidesteps the platform's ISR
 * entirely — an edit in Sanity shows on the next page load, always, with no
 * webhook or revalidate secret required. React `cache()` in queries.ts still
 * dedupes repeated reads within a single render, so a page is a handful of
 * Sanity calls, not one per component.
 *
 * `cache: "no-store"` also opts these routes into dynamic rendering, which is
 * the intended behaviour here. If Vercel ISR is ever confirmed working, this can
 * go back to `next: { tags, revalidate }` and the webhook becomes an instant-
 * publish upgrade again.
 */
export async function sanityFetch<T>(
  query: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const url = new URL(QUERY_URL);
  url.searchParams.set("query", query);
  // GROQ params are passed as `$name=<json>` query parameters.
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(`$${key}`, JSON.stringify(value));
  }
  url.searchParams.set("perspective", "published");
  // We never use the echoed query; dropping it keeps the response small.
  url.searchParams.set("returnQuery", "false");

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Sanity query failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as { result: T };
  return json.result;
}
