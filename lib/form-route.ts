import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";

import { SITE } from "./content";
import { sendFormMail, type Mail } from "./mail";
import { clientIp, rateLimit } from "./rate-limit";
import { isTurnstileConfigured, verifyTurnstile } from "./turnstile";
import {
  HONEYPOT_FIELD,
  TURNSTILE_RESPONSE_FIELD,
  toFieldErrors,
  type FormResponse,
} from "./form-shared";

/**
 * The shared body of every form endpoint: rate limit → parse → validate →
 * honeypot → send. Each route only supplies its schema and how to phrase the mail.
 */
/**
 * A best-effort destination for a submission beyond email — CRM, mailing list.
 * Runs only after mail succeeds and can never fail the request.
 */
export type Sink<T> = (data: T) => Promise<void>;

/** Per-route knobs for the shared handler. */
export type FormOptions = {
  /** Require a valid Cloudflare Turnstile token before processing. Enforced only
   *  where Turnstile is configured (see `isTurnstileConfigured`), so local dev
   *  and e2e without keys still run. */
  readonly requireTurnstile?: boolean;
};

export async function handleFormSubmission<S extends z.ZodType>(
  request: Request,
  schema: S,
  buildMail: (data: z.infer<S>) => Mail,
  sinks: Sink<z.infer<S>>[] = [],
  options: FormOptions = {},
): Promise<NextResponse<FormResponse>> {
  const ip = clientIp(request);
  const limit = rateLimit(ip);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Try again in a moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "That request wasn't readable." },
      { status: 400 },
    );
  }

  // Silently accept honeypot hits: telling a bot it failed just teaches it.
  if (
    typeof body === "object" &&
    body !== null &&
    typeof (body as Record<string, unknown>)[HONEYPOT_FIELD] === "string" &&
    (body as Record<string, string>)[HONEYPOT_FIELD].length > 0
  ) {
    return NextResponse.json({ ok: true });
  }

  // Bot check, before any processing. Enforced only where Turnstile is
  // configured; a token-less honeypot bot was already dropped above, and a real
  // client always carries a token. The failure stays generic — never say why.
  if (options.requireTurnstile && isTurnstileConfigured()) {
    const token =
      typeof body === "object" &&
      body !== null &&
      typeof (body as Record<string, unknown>)[TURNSTILE_RESPONSE_FIELD] === "string"
        ? (body as Record<string, string>)[TURNSTILE_RESPONSE_FIELD]
        : "";

    const verdict = await verifyTurnstile(token, ip);
    if (!verdict.success) {
      return NextResponse.json(
        { ok: false, error: "Verification failed. Please try again." },
        { status: 400 },
      );
    }
  } else if (options.requireTurnstile && process.env.NODE_ENV === "production") {
    // Skipping is only meant for local dev / e2e. In production it means the
    // secret is missing — bot protection is OFF. Make that loud in the logs.
    console.warn(
      "Turnstile is required for this route but TURNSTILE_SECRET_KEY is not set — bot protection is OFF.",
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Please check the highlighted fields.", fieldErrors: toFieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  // Email is the primary delivery path and runs first.
  const mailed = await sendFormMail(buildMail(parsed.data));

  // Sinks run whatever mail did. They used to sit behind the `mailed.ok` gate,
  // which meant a Resend outage discarded the submission entirely even when the
  // CRM was perfectly healthy — the one path still able to keep the lead was the
  // one being skipped. A CRM outage still can't fail the request in the other
  // direction, so between them nothing is lost that could have been kept.
  if (sinks.length) {
    const settled = await Promise.allSettled(sinks.map((sink) => sink(parsed.data)));
    for (const outcome of settled) {
      if (outcome.status === "rejected") console.error("Form sink failed:", outcome.reason);
    }
  }

  // Still an error even if a sink captured it: the visitor is owed the truth that
  // no one received their message, and a route to a person that does work.
  if (!mailed.ok) {
    return NextResponse.json(
      { ok: false, error: `${mailed.error} Email us directly at ${SITE.email}.` },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
