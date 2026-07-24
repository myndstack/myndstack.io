import "server-only";

import { createClient } from "next-sanity";

import { apiVersion, dataset, projectId } from "@/sanity/env";

/**
 * The read client, server-only.
 *
 * `useCdn` and the token move together on purpose. With a read token we talk to
 * the live API (`useCdn: false`) so a `revalidateTag` re-fetch returns the just-
 * published content immediately — that is the whole point of the webhook in
 * app/api/revalidate. With no token we fall back to the published CDN, which
 * needs no auth and still works, but can trail a publish by up to a minute.
 *
 * `stega: false` — this site never renders visual-editing overlays, and stega
 * markers would otherwise leak zero-width characters into the copy.
 */
const token = process.env.SANITY_API_READ_TOKEN;

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: !token,
  token,
  perspective: "published",
  stega: false,
});

/**
 * How long a statically generated page may serve stale CMS content before it
 * regenerates on the next request. This is a *floor*, not the primary path:
 *
 * - The webhook (app/api/revalidate) makes a publish appear instantly by tag.
 * - This time floor is the safety net for when the webhook isn't configured —
 *   without it, a fetch with no `revalidate` is cached permanently and a publish
 *   would not appear on the live site until the next deploy. With it, an edit
 *   shows within this window regardless. That means the site's content workflow
 *   works out of the box, and the webhook is an upgrade to "instant", not a
 *   prerequisite for "updates at all".
 *
 * 60s suits a marketing site: edits feel near-live, and regeneration cost is
 * trivial at this traffic. Raise it to cut API calls, lower it for faster
 * propagation.
 */
export const REVALIDATE_SECONDS = 60;

/**
 * Cache-tagged, time-bounded fetch. Tags let the webhook drop exactly the
 * affected content with `revalidateTag(tag)`; the time floor guarantees content
 * refreshes on its own even if the webhook never fires.
 */
export async function sanityFetch<T>(
  query: string,
  params: Record<string, unknown> = {},
  tags: string[] = [],
): Promise<T> {
  return sanityClient.fetch<T>(query, params, {
    next: { tags, revalidate: REVALIDATE_SECONDS },
  });
}
