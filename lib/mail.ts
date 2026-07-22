import "server-only";
import { Resend } from "resend";

import { singleLine } from "./format";

const apiKey = process.env.RESEND_API_KEY;

/** Where enquiries land. */
const TO = process.env.CONTACT_TO_EMAIL ?? "hello@myndstack.io";
/** Must be a domain you've verified in Resend. */
const FROM = process.env.CONTACT_FROM_EMAIL ?? "Myndstack <onboarding@resend.dev>";

const resend = apiKey ? new Resend(apiKey) : null;

export type Mail = {
  subject: string;
  /** `field → value` pairs, rendered as a definition list. */
  fields: Array<[label: string, value: string]>;
  /** Set so a reply goes to the person who filled the form, not to us. */
  replyTo?: string;
};

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

function render({ subject, fields }: Mail) {
  const text = [subject, "", ...fields.map(([l, v]) => `${l}: ${v}`)].join("\n");

  const rows = fields
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:6px 16px 6px 0;color:#6B6B73;font:600 12px/1.4 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.08em;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td>
          <td style="padding:6px 0;color:#F4F4F6;font:400 15px/1.6 system-ui,sans-serif">${escapeHtml(value).replace(/\n/g, "<br>")}</td>
        </tr>`,
    )
    .join("");

  const html = `<div style="background:#0A0A0B;padding:32px;font-family:system-ui,sans-serif">
    <div style="max-width:640px;margin:0 auto;background:#151517;border:1px solid #1F1F23;padding:28px 32px">
      <div style="color:#C9F24D;font:700 11px/1.4 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.16em;margin-bottom:18px">Myndstack</div>
      <h1 style="margin:0 0 22px;color:#fff;font:700 22px/1.2 system-ui,sans-serif;letter-spacing:-.02em">${escapeHtml(subject)}</h1>
      <table style="border-collapse:collapse;width:100%">${rows}</table>
    </div>
  </div>`;

  return { text, html };
}

/**
 * Sends a form submission. Without RESEND_API_KEY it logs instead and reports
 * success in development, so the forms are testable before the key exists —
 * but fails loudly in production rather than silently dropping a lead.
 */
export async function sendFormMail(mail: Mail): Promise<{ ok: boolean; error?: string }> {
  const { text, html } = render(mail);

  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      console.error("RESEND_API_KEY is not set — refusing to drop a submission.");
      return { ok: false, error: "Email is not configured on this deployment." };
    }
    console.info(`\n[dev] Would send to ${TO}:\n${text}\n`);
    return { ok: true };
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to: TO,
    // Both carry user input, and both land in line-delimited headers.
    subject: singleLine(mail.subject, 180),
    replyTo: mail.replyTo ? singleLine(mail.replyTo, 200) : undefined,
    text,
    html,
  });

  if (error) {
    console.error("Resend rejected the message:", error);
    return { ok: false, error: "We couldn't send that just now." };
  }

  return { ok: true };
}
