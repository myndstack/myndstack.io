/**
 * Runs once when the server starts, before it serves anything.
 *
 * Mail configuration used to be discovered at the bottom of a form submission —
 * by a visitor, in production, as a 502. `lib/mail.ts` is imported lazily, so
 * nothing evaluated it until someone had already tried to become a customer.
 * This surfaces it at boot instead.
 *
 * It logs and never throws. A throw here 500s every page on every cold start,
 * and a marketing site that renders with a broken form is strictly better than
 * one that does not render at all — `/api/health` is the signal something
 * automated should watch.
 */
export async function register() {
  // The hook also runs on the edge runtime, which never sends mail.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { resolveMailStatus } = await import("./lib/mail-config");
  const status = resolveMailStatus();

  if (status.state === "broken") {
    const list = status.problems.map((problem) => `  · ${problem}`).join("\n");
    console.error(`[mail] NOT DELIVERABLE — form submissions will fail:\n${list}`);
    return;
  }

  // Valid, but silent: every form returns success, shows "Message received", and
  // writes the lead to stdout. That loses leads more quietly than an outage does,
  // and it is the obvious thing to set when trying to make the 502s stop.
  if (status.state === "logging" && process.env.NODE_ENV === "production") {
    console.warn(
      "[mail] MAIL_TRANSPORT=console in production — submissions will succeed and reach nobody.",
    );
  }
}
