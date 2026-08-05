"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RegionCode } from "@/lib/content";
import { formatInrMinor, type Billing } from "@/lib/pricing-amount";

/**
 * The buy panel on /pricing/[slug]. It never sees a secret and never sets an
 * amount: it POSTs which tier + billing to /api/checkout/order (the server
 * resolves the price), opens Razorpay Checkout with the returned order, then
 * POSTs the success payload to /api/checkout/verify. The webhook is the
 * authoritative fulfilment signal; this is the buyer's immediate confirmation.
 *
 * Every charge settles in INR (Razorpay, India) — international cards included —
 * so the displayed amount and the note say INR regardless of the viewer's region.
 *
 * Critical state rule: Razorpay's `handler` fires ONLY after money has actually
 * moved. So a failure inside verify() is a post-payment failure and must never
 * return to an armed "Pay" button — that would invite a second charge. Only
 * pre-payment failures (the order call or the script load) keep Pay retryable.
 */

type RazorpayHandlerResponse = {
  readonly razorpay_payment_id: string;
  readonly razorpay_order_id: string;
  readonly razorpay_signature: string;
};

type RazorpayOptions = {
  readonly key: string;
  readonly order_id: string;
  readonly amount: number;
  readonly currency: string;
  readonly name: string;
  readonly description?: string;
  readonly theme?: { color?: string };
  readonly handler?: (response: RazorpayHandlerResponse) => void;
  readonly modal?: { ondismiss?: () => void };
};

type RazorpayInstance = { open: () => void };

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const SCRIPT_ID = "razorpay-checkout-script";
const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
/** If checkout.js never loads, stop waiting and let the panel degrade. */
const LOAD_TIMEOUT_MS = 10_000;

/** Inject checkout.js once; resolve true when window.Razorpay is available. */
function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);

    let settled = false;
    const done = (ok: boolean) => {
      if (!settled) {
        settled = true;
        resolve(ok);
      }
    };

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => done(Boolean(window.Razorpay)));
    script.addEventListener("error", () => done(false));
    window.setTimeout(() => done(Boolean(window.Razorpay)), LOAD_TIMEOUT_MS);
  });
}

/**
 * idle → starting → (Razorpay modal) → verifying → success
 *                 ↘ error            (pre-payment: order/script failed — Pay stays retryable)
 *                                      ↘ paid_unverified (money moved, verify hiccup — NOT retryable)
 */
type Status =
  | "idle"
  | "starting"
  | "verifying"
  | "success"
  | "error"
  | "paid_unverified";

type Props = {
  readonly slug: string;
  readonly tierName: string;
  readonly amountMinorMonthly: number;
  readonly amountMinorAnnual: number;
  readonly annualNote?: string;
  /** A single fixed charge (e.g. the Discovery Sprint) — no monthly/annual toggle. */
  readonly oneTime?: boolean;
  /** Region shown on first paint (server-resolved to DEFAULT_REGION). */
  readonly initialRegion: RegionCode;
  /** Region display price string (e.g. "$599") for SSR; the charge stays INR. */
  readonly initialDisplayPrice: string;
  readonly initialDisplayAnnualPrice?: string;
};

export default function CheckoutPanel({
  slug,
  tierName,
  amountMinorMonthly,
  amountMinorAnnual,
  annualNote,
  oneTime = false,
  initialRegion,
  initialDisplayPrice,
  initialDisplayAnnualPrice,
}: Props) {
  const [billing, setBilling] = useState<Billing>("monthly");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Region-aware DISPLAY only — the charge below is ALWAYS INR. SSR paints the
  // default region; on mount we fetch /api/pricing (geo + cookie) so the shown
  // currency matches the pricing section the buyer came from. A failed fetch
  // keeps the server-rendered default rather than blanking the price.
  const [region, setRegion] = useState<RegionCode>(initialRegion);
  const [displayPrice, setDisplayPrice] = useState(initialDisplayPrice);
  const [displayAnnualPrice, setDisplayAnnualPrice] = useState(initialDisplayAnnualPrice);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch("/api/pricing", { headers: { accept: "application/json" } });
        if (!res.ok) return;
        const data = (await res.json()) as {
          region: RegionCode;
          tiers: Array<{ checkout?: { slug?: string }; price?: string; annualPrice?: string }>;
        };
        const match = data.tiers?.find((t) => t.checkout?.slug === slug);
        if (live && match?.price) {
          setRegion(data.region);
          setDisplayPrice(match.price);
          setDisplayAnnualPrice(match.annualPrice);
        }
      } catch {
        // Keep the server-rendered default region.
      }
    })();
    return () => {
      live = false;
    };
  }, [slug]);

  const annual = billing === "annual";
  const amountMinor = annual ? amountMinorAnnual : amountMinorMonthly;
  const busy = status === "starting" || status === "verifying";
  const settled = status === "success" || status === "paid_unverified";

  // The charge is INR, so IN shows the real charge amount; other regions show
  // their indicative display string with the INR charge spelled out beneath.
  const isIN = region === "IN";
  const headline = isIN
    ? formatInrMinor(amountMinor)
    : annual && displayAnnualPrice
      ? displayAnnualPrice
      : displayPrice;

  // Move focus to the terminal confirmation once it renders. The Razorpay modal
  // that held focus is gone and the Pay button has unmounted, so without this
  // focus falls back to <body>. role="status" on the panels announces the change.
  useEffect(() => {
    if (settled) headingRef.current?.focus();
  }, [settled]);

  const verify = useCallback(async (resp: RazorpayHandlerResponse) => {
    setStatus("verifying");
    try {
      const res = await fetch("/api/checkout/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          orderId: resp.razorpay_order_id,
          paymentId: resp.razorpay_payment_id,
          signature: resp.razorpay_signature,
        }),
      });
      const data = (await res.json()) as { ok?: boolean };
      // Any post-payment failure lands in paid_unverified — never back to an
      // armed Pay button. The money already moved; the signed webhook still
      // reaches us even if this confirmation call didn't.
      setStatus(res.ok && data.ok ? "success" : "paid_unverified");
    } catch {
      setStatus("paid_unverified");
    }
  }, []);

  const pay = useCallback(async () => {
    setError(null);
    setStatus("starting");
    try {
      const orderRes = await fetch("/api/checkout/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ tierSlug: slug, billing }),
      });
      const order = (await orderRes.json()) as {
        ok?: boolean;
        error?: string;
        keyId?: string;
        orderId?: string;
        amount?: number;
        currency?: string;
      };
      if (!orderRes.ok || !order.ok || !order.keyId || !order.orderId) {
        // Pre-payment failure — no money moved, so Pay stays retryable.
        setStatus("error");
        setError(order.error ?? "Couldn't start the payment. Please try again.");
        return;
      }

      const ready = await loadRazorpay();
      if (!ready || !window.Razorpay) {
        setStatus("error");
        setError("The payment window couldn't load. Check your connection and try again.");
        return;
      }

      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount ?? amountMinor,
        currency: order.currency ?? "INR",
        name: "Myndstack",
        description: `${tierName} · ${annual ? "Annual" : "Monthly"}`,
        theme: { color: "#c9f24d" },
        // Razorpay fires ondismiss only on a manual close WITHOUT payment (the
        // handler fires on success instead), so returning to idle is safe here.
        modal: { ondismiss: () => setStatus("idle") },
        handler: (resp) => {
          void verify(resp);
        },
      });
      // Hand control to Razorpay's modal; the handler drives verify → success.
      setStatus("idle");
      rzp.open();
    } catch {
      setStatus("error");
      setError("Something went wrong starting the payment. Please try again.");
    }
  }, [slug, billing, tierName, annual, amountMinor, verify]);

  // Payment succeeded and was verified.
  if (status === "success") {
    return (
      <div
        role="status"
        className="clip-angular-26 border border-lime bg-surface-3 p-7 shadow-[var(--edge-ring)]"
      >
        <div className="eyebrow mb-3 text-lime">Payment received</div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="m-0 mb-2 font-display text-2xl font-semibold tracking-[-0.02em] focus:outline-none"
        >
          You&apos;re in.
        </h2>
        <p className="m-0 text-sm leading-[1.6] text-t4">
          {oneTime
            ? `Thanks for booking the ${tierName}. We'll email you within one business day to schedule the kickoff.`
            : `Thanks for subscribing to ${tierName}. We'll email you shortly to get your workspace set up.`}{" "}
          A receipt is on its way from Razorpay.
        </p>
      </div>
    );
  }

  // Money moved, but the in-page confirmation call didn't complete. A terminal,
  // non-actionable state — no Pay button — so the buyer is never invited to pay
  // twice. The signed webhook still reaches us.
  if (status === "paid_unverified") {
    return (
      <div role="status" className="clip-angular-26 border border-line bg-surface p-7">
        <div className="eyebrow mb-3">Payment received</div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="m-0 mb-2 font-display text-2xl font-semibold tracking-[-0.02em] focus:outline-none"
        >
          Thanks — we&apos;ve got your payment.
        </h2>
        <p className="m-0 text-sm leading-[1.6] text-t4">
          Your payment went through. We had a brief hiccup confirming it here, but
          there&apos;s no need to pay again — we&apos;ll email you shortly to finish
          setup, and your receipt is on its way from Razorpay.
        </p>
      </div>
    );
  }

  return (
    <div className="clip-angular-26 border border-line bg-surface p-7">
      <div className="eyebrow mb-3.5">Checkout</div>
      <h2 className="m-0 mb-1.5 font-display text-2xl font-semibold tracking-[-0.02em]">
        {tierName}
      </h2>
      <p className="mt-0 mb-6 text-sm leading-[1.55] text-t4">
        {oneTime
          ? "Book online — we'll email you within one business day to schedule."
          : "Subscribe online and start today. Cancel anytime."}
      </p>

      {!oneTime ? (
        <div
          role="group"
          aria-label="Billing period"
          className="mb-6 inline-flex border border-line-3 bg-surface"
        >
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            aria-pressed={!annual}
            disabled={busy}
            className={`bill-btn${!annual ? " is-on" : ""}`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling("annual")}
            aria-pressed={annual}
            disabled={busy}
            className={`bill-btn${annual ? " is-on" : ""}`}
          >
            Annual · save 2 mo
          </button>
        </div>
      ) : null}

      <div className="mb-6" aria-live="polite">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-[clamp(32px,5vw,44px)] font-bold tracking-[-0.02em]">
            {headline}
          </span>
          <span className="text-sm text-t5">
            {oneTime ? "one-time" : annual ? "/ yr" : "/ mo"}
          </span>
        </div>
        <div className="mt-2 h-3.5 font-mono text-[11px] tracking-[0.04em] text-lime">
          {annual && annualNote ? annualNote : ""}
        </div>
        <p className="mt-3 mb-0 font-mono text-[11.5px] leading-[1.5] tracking-[0.04em] text-t5">
          {isIN
            ? "Paid in INR via Razorpay — UPI, cards & netbanking."
            : `Billed in INR (${formatInrMinor(amountMinor)}) via Razorpay — international cards accepted, charged in INR.`}
        </p>
      </div>

      <button
        type="button"
        onClick={() => void pay()}
        disabled={busy}
        className="block w-full bg-lime p-3 text-center text-[15px] font-semibold text-lime-ink transition-colors hover:bg-lime-hover disabled:cursor-progress disabled:opacity-60"
      >
        {status === "starting"
          ? "Starting…"
          : status === "verifying"
            ? "Confirming…"
            : `Pay ${formatInrMinor(amountMinor)}`}
      </button>

      {status === "error" && error ? (
        <p role="alert" className="mt-3 mb-0 text-[13px] leading-[1.5] text-danger">
          {error}
        </p>
      ) : null}

      <p className="mt-4 mb-0 text-[12px] leading-[1.5] text-t5">
        Secure payment handled by Razorpay. Card details never touch Myndstack.
      </p>
    </div>
  );
}
