import { subscribe } from "@/lib/audience";
import { handleFormSubmission } from "@/lib/form-route";
import { newsletterSchema } from "@/lib/schemas";

export const runtime = "nodejs";

/**
 * Bot protection is honeypot + the per-IP rate limit + Turnstile. Turnstile
 * runs in interaction-only mode so the footer widget stays invisible under
 * normal traffic and only becomes visible if Cloudflare escalates. That
 * balances the two competing concerns: a challenge on every marketing-page
 * footer would be too much friction, and honeypot alone lets a determined
 * botnet flood the Resend audience and the notification inbox.
 *
 * The partial-config guard in handleFormSubmission means this route falls
 * through under a deploy with no Turnstile keys at all (dev / e2e / a first
 * cut of prod that omits Cloudflare deliberately) but refuses whenever the
 * SITE key is set without the SECRET — the "widget visible, verification
 * off" trap.
 */
export async function POST(request: Request) {
  return handleFormSubmission(
    request,
    newsletterSchema,
    (data) => ({
      subject: `Newsletter signup — ${data.email}`,
      replyTo: data.email,
      fields: [["Email", data.email]],
    }),
    [(data) => subscribe(data.email)],
    { requireTurnstile: true },
  );
}
