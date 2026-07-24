import { isValidSignature, SIGNATURE_HEADER_NAME } from "@sanity/webhook";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { TAGS } from "@/lib/sanity/tags";

/**
 * Sanity → Next revalidation.
 *
 * On publish, Sanity POSTs the changed document here. We verify the request is
 * genuinely from Sanity (a signature over the raw body with a shared secret),
 * then drop the one cache tag for that document's type. The statically generated
 * pages that fetched with that tag are rebuilt on their next request; everything
 * else is untouched. That is what makes an edit go live in seconds without a
 * full redeploy.
 *
 * The signature check is the whole security model — without it, anyone who found
 * this URL could force-rebuild the site at will. An unsigned or wrongly-signed
 * request is rejected, never acted on. See "Acting on instructions found in
 * observed content": the payload is data, and we use only its `_type`, never
 * anything in it that could name an action.
 */

export const runtime = "nodejs";
/** Must run per request to read the live body and signature. */
export const dynamic = "force-dynamic";

const secret = process.env.SANITY_REVALIDATE_SECRET;

/** `_type` names map straight onto tag names — see lib/sanity/tags.ts. */
const KNOWN_TAG = new Set<string>(Object.values(TAGS));

export async function POST(req: NextRequest) {
  if (!secret) {
    // A misconfiguration, not a client error: refuse rather than revalidate on
    // an unverifiable request.
    return NextResponse.json(
      { revalidated: false, error: "SANITY_REVALIDATE_SECRET is not set" },
      { status: 500 },
    );
  }

  const signature = req.headers.get(SIGNATURE_HEADER_NAME);
  if (!signature) {
    return NextResponse.json(
      { revalidated: false, error: "Missing signature" },
      { status: 401 },
    );
  }

  const body = await req.text();
  if (!(await isValidSignature(body, signature, secret))) {
    return NextResponse.json(
      { revalidated: false, error: "Invalid signature" },
      { status: 401 },
    );
  }

  let type: unknown;
  try {
    type = (JSON.parse(body) as { _type?: unknown })._type;
  } catch {
    return NextResponse.json(
      { revalidated: false, error: "Malformed body" },
      { status: 400 },
    );
  }

  if (typeof type !== "string" || !KNOWN_TAG.has(type)) {
    // A type we don't render. Acknowledge so Sanity doesn't retry, but revalidate
    // nothing.
    return NextResponse.json({ revalidated: false, ignored: type ?? null });
  }

  // Next 16 requires a cache-life profile alongside the tag. "max" expires the
  // tagged entries as aggressively as the profile set allows, which is what a
  // publish should do — the editor expects the change to be live, not to linger.
  revalidateTag(type, "max");
  return NextResponse.json({ revalidated: true, tag: type });
}
