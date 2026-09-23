import { NextResponse } from "next/server";

import { sendFormMail } from "@/lib/mail";
import { formatInrMinor } from "@/lib/pricing-amount";
import { verifyWebhookSignature } from "@/lib/razorpay";

export const runtime = "nodejs";

/**
 * Events we notify on. Anything else with a valid signature is acked and ignored.
 * Only `payment.captured`: Razorpay also fires `order.paid` for the same payment,
 * and handling both sent two notification emails per purchase.
 */
const HANDLED = new Set(["payment.captured"]);

/** The slice of the Razorpay webhook payload we read — typed, no `any`. */
type WebhookPayment = {
  readonly id?: string;
  readonly order_id?: string;
  readonly amount?: number;
  readonly email?: string;
  readonly contact?: string;
  readonly notes?: Readonly<Record<string, string>>;
};
type WebhookEvent = {
  readonly event?: string;
  readonly payload?: { readonly payment?: { readonly entity?: WebhookPayment } };
};

export async function POST(request: Request) {
  // Verify against the EXACT raw bytes — re-serializing would change the HMAC.
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(raw, signature)) {
    // Unsigned or forged — reject before parsing or any side effect.
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(raw) as WebhookEvent;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (event.event && HANDLED.has(event.event)) {
    const payment = event.payload?.payment?.entity ?? {};
    const notes = payment.notes ?? {};
    // Phase 1 notifies the team so a human provisions the account; Phase 2/3 add
    // the DB that grants the entitlement automatically and dedupes by payment id.
    // Until then a retried delivery may re-notify — low-harm and intentional.
    const mailed = await sendFormMail({
      subject: `Payment received — ${notes.tier ?? "plan"} (${notes.billing ?? "—"})`,
      fields: [
        ["Event", event.event],
        ["Payment ID", payment.id ?? "—"],
        ["Order ID", payment.order_id ?? "—"],
        ["Amount", typeof payment.amount === "number" ? formatInrMinor(payment.amount) : "—"],
        ["Tier", notes.tier ?? "—"],
        ["Billing", notes.billing ?? "—"],
        ["Email", payment.email ?? "—"],
        ["Contact", payment.contact ?? "—"],
      ],
    });
    // Provisioning is manual and hangs off this email. Failing the delivery makes
    // Razorpay retry it, instead of acking a payment nobody was told about.
    if (!mailed.ok) {
      console.error("[razorpay webhook] notification failed", payment.id, mailed.error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  }

  // Ack every validly-signed delivery so Razorpay stops retrying.
  return NextResponse.json({ ok: true });
}
