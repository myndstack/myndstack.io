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
 * How long a statically generated page may serve stale CMS content before it
 * regenerates. This is a *floor*, not the primary path: the webhook
 * (app/api/revalidate) makes a publish appear instantly by tag; this guarantees
 * content still refreshes on its own within the window even if the webhook is
 * never configured. 60s suits a marketing site — near-live, negligible cost.
 */
export const REVALIDATE_SECONDS = 60;

/**
 * Cache-tagged, time-bounded read. Tags let the revalidate webhook drop exactly
 * the affected content with `revalidateTag(tag)`; the time floor refreshes it
 * anyway if the webhook never fires.
 */
export async function sanityFetch<T>(
  query: string,
  params: Record<string, unknown> = {},
  tags: string[] = [],
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
    next: { tags, revalidate: REVALIDATE_SECONDS },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Sanity query failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as { result: T };
  return json.result;
}
