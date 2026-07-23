import "server-only";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const audienceId = process.env.RESEND_AUDIENCE_ID;

const resend = apiKey ? new Resend(apiKey) : null;

/**
 * Adds a newsletter signup to a real Resend audience.
 *
 * Without both a key and an audience id this no-ops, and the signup still reaches
 * you as an email — the list is an upgrade on that path, not a replacement for it.
 * Best-effort like the other sinks: failures are logged, never surfaced.
 */
export async function subscribe(email: string): Promise<void> {
  if (!resend || !audienceId) return;

  try {
    const { error } = await resend.contacts.create({
      audienceId,
      email,
      unsubscribed: false,
    });
    if (error) console.error("Resend audience add failed:", error);
  } catch (error) {
    console.error("Resend audience request threw:", error);
  }
}
