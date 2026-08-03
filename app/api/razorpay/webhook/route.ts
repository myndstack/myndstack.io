import { NextResponse } from "next/server";

import { sendFormMail } from "@/lib/mail";
import { formatInrMinor } from "@/lib/pricing-amount";
import { verifyWebhookSignature } from "@/lib/razorpay";

export const runtime = "nodejs";

/** Events we notify on. Anything else with a valid signature is acked and ignored. */
const HANDLED = new Set(["payment.captured", "order.paid"]);

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
    await sendFormMail({
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
  }

  // Ack every validly-signed delivery so Razorpay stops retrying.
  return NextResponse.json({ ok: true });
}
