import "server-only";
import { singleLine } from "./format";

const TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const BASE = "https://api.hubapi.com/crm/v3/objects/contacts";

export type Lead = {
  name: string;
  email: string;
  company?: string;
  message?: string;
};

/**
 * Splits a free-text name into HubSpot's first/last fields. Imperfect by nature —
 * one-word names become a first name, everything after the first space is the
 * last name. Good enough for a contact record; the email is the real key.
 */
function splitName(name: string) {
  const parts = singleLine(name, 120).split(" ");
  return {
    firstname: parts[0] ?? "",
    lastname: parts.slice(1).join(" "),
  };
}

/**
 * Creates or updates a HubSpot contact.
 *
 * **Standard properties only.** HubSpot rejects the entire request with a 400 if
 * you write a property the portal doesn't define, so this maps only properties
 * that ship with every portal: `email`, `firstname`, `lastname`, `company`,
 * `message` (HubSpot's own default for form comments) and `hs_lead_status`.
 *
 * `budget` and "how did you hear about us" have no standard equivalent —
 * `hs_analytics_source` looks close but is a HubSpot-managed enumeration for
 * traffic source, not a free-text field, and writing to it would be wrong. Those
 * two stay in the notification email until the portal defines custom properties.
 *
 * Best-effort by design: this runs as a sink after mail has already succeeded, so
 * a CRM outage must never fail the request or lose the lead. Errors are logged
 * and swallowed.
 */
export async function upsertContact(lead: Lead): Promise<void> {
  if (!TOKEN) return;

  const properties: Record<string, string> = {
    email: lead.email,
    ...splitName(lead.name),
    ...(lead.company ? { company: singleLine(lead.company, 160) } : {}),
    ...(lead.message ? { message: lead.message.slice(0, 65_000) } : {}),
  };

  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  };

  try {
    const created = await fetch(BASE, {
      method: "POST",
      headers,
      // Lead status is set on create only. Someone already marked CONNECTED or
      // OPEN_DEAL who fills the form again must not be reset to NEW.
      body: JSON.stringify({ properties: { ...properties, hs_lead_status: "NEW" } }),
    });

    if (created.ok) return;

    // 409 = a contact with this email already exists. Update it instead.
    if (created.status === 409) {
      const updated = await fetch(
        `${BASE}/${encodeURIComponent(lead.email)}?idProperty=email`,
        { method: "PATCH", headers, body: JSON.stringify({ properties }) },
      );
      if (!updated.ok) {
        console.error("HubSpot update failed:", updated.status, await updated.text());
      }
      return;
    }

    console.error("HubSpot create failed:", created.status, await created.text());
  } catch (error) {
    console.error("HubSpot request threw:", error);
  }
}
