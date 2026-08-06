import { subscribe } from "@/lib/audience";
import { handleFormSubmission } from "@/lib/form-route";
import { newsletterSchema } from "@/lib/schemas";

export const runtime = "nodejs";

/**
 * Bot protection here is honeypot + the per-IP rate limit only — deliberately
 * NOT Turnstile. Contact and Careers apply carry a visible Turnstile widget
 * because the cost of a false positive on those (missed lead, missed
 * application) is bounded; a challenge on the footer newsletter would fire on
 * every marketing page for every visitor. See lib/form-route.ts for how
 * requireTurnstile behaves when enabled.
 *
 * If newsletter spam becomes real: switch this route to `requireTurnstile:
 * true` AND add the Turnstile widget to components/Newsletter.tsx (invisible
 * or size="compact" so the footer stays quiet), NOT one without the other.
 */
export async function POST(request: Request) {
  return handleFormSubmission(request, newsletterSchema, (data) => ({
    subject: `Newsletter signup — ${data.email}`,
    replyTo: data.email,
    fields: [["Email", data.email]],
  }), [(data) => subscribe(data.email)]);
}
