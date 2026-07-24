/**
 * Sanity connection constants, resolved once from the environment.
 *
 * Imported by the standalone Studio config (via the Sanity CLI) AND by the
 * server query layer in the Next app. Those two runtimes expose env vars under
 * different prefixes — the Next app has `NEXT_PUBLIC_SANITY_*`, the Sanity CLI
 * bundles `SANITY_STUDIO_*` — so both are accepted, falling back to the known
 * public values for project `e3tbagdk`.
 *
 * Project id and dataset are public, non-secret identifiers (they ship in the
 * browser either way), so a hardcoded fallback is safe and removes a whole class
 * of "which prefix did that runtime load?" breakage. The read/write tokens are
 * the actual secrets, and those are read where they are used, never here.
 */

const DEFAULT_PROJECT_ID = "e3tbagdk";
const DEFAULT_DATASET = "production";

export const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ??
  process.env.SANITY_STUDIO_PROJECT_ID ??
  DEFAULT_PROJECT_ID;

export const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET ??
  process.env.SANITY_STUDIO_DATASET ??
  DEFAULT_DATASET;

/** Pinned so a client and a dataset export never disagree about the API shape. */
export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION ??
  process.env.SANITY_STUDIO_API_VERSION ??
  "2025-01-01";
