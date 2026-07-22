import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";

import { sendFormMail, type Mail } from "./mail";
import { clientIp, rateLimit } from "./rate-limit";
import { HONEYPOT_FIELD, toFieldErrors, type FormResponse } from "./form-shared";

/**
 * The shared body of every form endpoint: rate limit → parse → validate →
 * honeypot → send. Each route only supplies its schema and how to phrase the mail.
 */
export async function handleFormSubmission<S extends z.ZodType>(
  request: Request,
  schema: S,
  buildMail: (data: z.infer<S>) => Mail,
): Promise<NextResponse<FormResponse>> {
  const limit = rateLimit(clientIp(request));
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

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Please check the highlighted fields.", fieldErrors: toFieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const result = await sendFormMail(buildMail(parsed.data));
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: `${result.error} Email us directly at hello@myndstack.io.` },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
