import { NextResponse } from "next/server";

import { MAIL_STATUS } from "@/lib/mail";

/**
 * Readiness of the one thing on this site that can fail silently.
 *
 * - `ok` — form submissions will not 502. False only when mail is misconfigured.
 * - `deliverable` — mail actually reaches a person. False under the console
 *   transport, which is a valid configuration but not a delivering one, and is
 *   the state that loses leads without producing a single error.
 *
 * Two booleans and nothing else. Which transport is configured, and precisely
 * why it is unhappy, is in the server log rather than on a public URL.
 */
export const runtime = "nodejs";
/** Reports live process state, so it must never be answered from a cache. */
export const dynamic = "force-dynamic";

export function GET() {
  const ok = MAIL_STATUS.state !== "broken";

  return NextResponse.json(
    { ok, deliverable: MAIL_STATUS.state === "deliverable" },
    { status: ok ? 200 : 503 },
  );
}
