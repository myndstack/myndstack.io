"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RegionCode, TierCheckout } from "@/lib/content";
import { breakdownFor, formatChargeMinor, type Billing } from "@/lib/pricing-amount";
import CurrencyPicker from "./CurrencyPicker";
import PaymentMarks from "./PaymentMarks";
import Scanline from "./Scanline";
import SlideToPay from "./SlideToPay";

/**
 * The buy panel on /pricing/[slug]. It never sees a secret and never sets an
 * amount: it POSTs which tier + billing to /api/checkout/order (the server
 * resolves the price), opens Razorpay Checkout with the returned order, then
 * POSTs the success payload to /api/checkout/verify. The webhook is the
 * authoritative fulfilment signal; this is the buyer's immediate confirmation.
 *
 * The order is created in the visitor's currency via breakdownFor (Razorpay
 * International Payments) — €549 to a EU buyer, ₹49,999 + 18% GST to an IN one —
 * and Razorpay settles it to us in INR. The shown total, the button, and the
 * created order all come from the SAME breakdownFor, so they can never diverge;
 * a malformed regional amount fails safe to the INR base, and unresolvable tax
 * fails safe to zero rather than to a guess.
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

/**
 * Ask the server to resolve BOTH regions. Pure — it returns them rather than
 * setting state — so the two callers below can each decide what to do with the
 * result, and neither hides a setState behind a plain function call.
 *
 * Returns null on any failure, which the callers read as "keep what we have"
 * rather than blanking the panel.
 */
async function fetchRegions(): Promise<
  { region: RegionCode; taxRegion: RegionCode } | null
> {
  try {
    const res = await fetch("/api/pricing", {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      region?: RegionCode;
      taxRegion?: RegionCode;
    };
    if (!data.region) return null;
    // Older payloads without taxRegion fall back to region — same as before.
    return { region: data.region, taxRegion: data.taxRegion ?? data.region };
  } catch {
    return null;
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
  /** One line under the item name — the tier's own blurb. */
  readonly description?: string;
  readonly amountMinorMonthly: number;
  readonly amountMinorAnnual: number;
  readonly annualNote?: string;
  /** A single fixed charge (e.g. the Discovery Sprint) — no monthly/annual toggle. */
  readonly oneTime?: boolean;
  /** Region shown on first paint (server-resolved to DEFAULT_REGION). */
  readonly initialRegion: RegionCode;
  /** Per-region charge amounts — drives the shown price, the button, and (via the
   *  same breakdownFor on the server) the created order. Absent region → INR base. */
  readonly regionalCharges?: TierCheckout["regionalCharges"];
};

export default function CheckoutPanel({
  slug,
  tierName,
  description,
  amountMinorMonthly,
  amountMinorAnnual,
  annualNote,
  oneTime = false,
  initialRegion,
  regionalCharges,
}: Props) {
  const [billing, setBilling] = useState<Billing>("monthly");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  /**
   * TWO regions, deliberately, because they answer different questions.
   *
   * `region` picks the CURRENCY, and the buyer may change it with the dropdown.
   * `taxRegion` is the PLACE OF SUPPLY — where the buyer actually is — and the
   * dropdown must never touch it. A currency is a preference; a country is not.
   * Sharing one value here is what let a buyer in India select "USD" and drop
   * their 18% GST, so the split is load-bearing rather than tidy.
   *
   * SSR paints the server default for both; on mount we read what /api/pricing
   * resolved, which is the same resolution the order route performs — so the
   * total on screen is the total that gets charged. A failed fetch keeps the
   * server default rather than blanking the panel.
   */
  const [region, setRegion] = useState<RegionCode>(initialRegion);
  const [taxRegion, setTaxRegion] = useState<RegionCode>(initialRegion);

  /**
   * Promo state. `applied` holds the CODE and the previewed discount, but the
   * discount is only ever for display — the order route looks the code up and
   * evaluates it again, so nothing here can change what is charged.
   */
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [applied, setApplied] = useState<
    { code: string; discountMinor: number } | null
  >(null);

  /**
   * Ask the server to resolve BOTH regions, and take them as a pair.
   *
   * This has to run again after every currency change, not just on mount. The
   * order route resolves the tax region as `geo ?? cookie` — so on a host with
   * no geo header, picking a currency also moves the tax region server-side.
   * Deriving taxRegion on the client instead would drift: the panel would still
   * be showing the region it saw at mount while the server charged against the
   * new one. A buyer would read "Total ₹49,999 · Tax none added" and be billed
   * ₹58,998.82 — precisely the divergence this panel exists to prevent.
   *
   * One round trip per currency change, and the displayed total is by
   * construction the total the server will charge.
   */
  const syncRegions = useCallback(async () => {
    const next = await fetchRegions();
    if (!next) return;
    setRegion(next.region);
    setTaxRegion(next.taxRegion);
  }, []);

  useEffect(() => {
    // `live` guards the unmount race: the panel can be replaced by a terminal
    // state while this is still in flight, and setting state on the way out is
    // a warning at best. The setState calls sit inside the async closure rather
    // than behind a call to syncRegions so the effect lint rule can see they
    // are not synchronous.
    let live = true;
    void (async () => {
      const next = await fetchRegions();
      if (!live || !next) return;
      setRegion(next.region);
      setTaxRegion(next.taxRegion);
    })();
    return () => {
      live = false;
    };
  }, []);

  const annual = billing === "annual";
  const amountMinor = annual ? amountMinorAnnual : amountMinorMonthly;
  const busy = status === "starting" || status === "verifying";
  const settled = status === "success" || status === "paid_unverified";

  // Single source of truth for money — the SAME breakdownFor the order route
  // runs, so the total on screen, the button label and the created order are one
  // number. Any missing or malformed regional amount falls back to the INR base;
  // tax (GST for an IN buyer) is added on top of whichever amount wins.
  const charge =
    breakdownFor(
      {
        slug,
        currency: "INR",
        amountMinor: amountMinorMonthly,
        annualAmountMinor: amountMinorAnnual,
        regionalCharges,
      },
      billing,
      region,
      taxRegion,
      applied?.discountMinor ?? 0,
    ) ?? {
      netMinor: amountMinor,
      discountMinor: 0,
      taxMinor: 0,
      grossMinor: amountMinor,
      currency: "INR" as const,
      taxLabel: null,
      taxName: "Tax",
    };
  // The headline and the Pay button are GROSS — what actually gets charged.
  const headline = formatChargeMinor(charge.grossMinor, charge.currency);
  const netLabel = formatChargeMinor(charge.netMinor, charge.currency);
  const taxLabel = formatChargeMinor(charge.taxMinor, charge.currency);
  const discountLabel = `−${formatChargeMinor(charge.discountMinor, charge.currency)}`;
  const period = oneTime ? "" : annual ? " per year" : " per month";

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

  /**
   * Preview a code. The reply is display-only: the order route looks the code
   * up again and re-evaluates it, so a tampered response here buys nothing.
   */
  const applyPromo = useCallback(async () => {
    const code = promoInput.trim();
    if (!code || promoBusy) return;
    setPromoBusy(true);
    setPromoError(null);
    try {
      const res = await fetch("/api/checkout/promo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ code, tierSlug: slug, billing }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        code?: string;
        discountMinor?: number;
      };
      if (data.ok && data.code && typeof data.discountMinor === "number") {
        setApplied({ code: data.code, discountMinor: data.discountMinor });
        setPromoInput("");
      } else {
        setApplied(null);
        setPromoError(data.message ?? "That code isn't valid.");
      }
    } catch {
      setPromoError("Couldn't check that code. Try again.");
    } finally {
      setPromoBusy(false);
    }
  }, [promoInput, promoBusy, slug, billing]);

  /**
   * A code priced against the old currency or billing period is stale the
   * moment either changes, so drop it rather than show a discount the server
   * would recompute differently.
   *
   * Done in the handlers that cause the change, not in an effect watching them:
   * clearing state from an effect body runs a second render pass every time,
   * and the two events that can invalidate a code are both right here.
   */
  const dropPromo = useCallback(() => {
    setApplied(null);
    setPromoError(null);
  }, []);

  const pay = useCallback(async () => {
    setError(null);
    setStatus("starting");
    try {
      const orderRes = await fetch("/api/checkout/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        // The CODE only. Never the discount — the server re-derives that, and
        // an amount sent from here would be a number the buyer could edit.
        body: JSON.stringify({
          tierSlug: slug,
          billing,
          ...(applied ? { promoCode: applied.code } : {}),
        }),
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
  }, [slug, billing, tierName, annual, amountMinor, applied, verify]);

  // Payment succeeded and was verified.
  if (status === "success") {
    return (
      <div
        role="status"
        className="clip-angular-26 border border-lime bg-surface-3 p-6 shadow-[var(--edge-ring)]"
      >
        <div className="eyebrow mb-2.5 text-lime">Payment received</div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="m-0 mb-2 font-display text-xl font-semibold tracking-[-0.02em] focus:outline-none"
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
      <div role="status" className="clip-angular-26 border border-line bg-surface p-6">
        <div className="eyebrow mb-2.5">Payment received</div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="m-0 mb-2 font-display text-xl font-semibold tracking-[-0.02em] focus:outline-none"
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
    <>
    {/* The featured-pricing-card treatment, not a neutral card. This panel is
       the most committed surface on the site — it is where money moves — yet it
       was styled below the marketing card the buyer clicked to reach it:
       `border-line` on `surface`, against that card's lime border on
       `surface-3`. Reading plainer than its own upstream is what made it feel
       generic. Same tokens as `.pricing-card--featured` and
       `.story-layer.is-locked`, so it lands as the end of that sequence rather
       than a new idea.

       Shadows are NOT used for the lime edge here: `clip-angular` is a
       clip-path, and a `0 0 0 1px` ring paints outside the box, so it would be
       cut away. The border is inside the box and survives the clip. */}
    <div className="clip-angular-26 relative border border-lime bg-surface-3 p-6 shadow-[var(--edge-lip)]">
      {/* The site's own entry signature — a lime hairline sweeping the top
          edge, once, on first view. Seen a handful of times per session, which
          is exactly the frequency that earns an animation. */}
      <Scanline />
      {/* Header row: what this is, and the currency it will be charged in.
          "Order summary", not "Checkout" — the page header already says
          Checkout, and repeating it wasted the one lime line the panel gets.

          The picker sits HERE rather than only on /#pricing because a buyer who
          landed straight on this page from a link had no way to change currency
          at all; their only option was to go back. It changes the currency and
          nothing else — see the two-region note above. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="eyebrow">Order summary</div>
        {/* The picker has already written the cookie by the time this fires.
            Paint the new currency straight away so the control feels instant,
            then re-resolve from the server — that second step is what keeps the
            tax line honest, since the cookie can move the tax region too on a
            host without geo. */}
        <CurrencyPicker
          compact
          region={region}
          onChange={(next) => {
            if (next) setRegion(next);
            dropPromo();
            void syncRegions();
          }}
        />
      </div>

      {/* The line item. The panel used to name the tier and then jump to a bare
          total, which left a wide card mostly empty and made the buyer confirm
          a number without restating what it buys. Name, what it is, and its
          price on one row is the shape every order summary has, for the good
          reason that it answers "am I buying the right thing" in one glance. */}
      <div className="flex items-start justify-between gap-4 border-t border-line pt-4">
        <div className="min-w-0">
          <h2 className="m-0 font-display text-[17px] leading-[1.25] font-semibold tracking-[-0.01em]">
            {tierName}
          </h2>
          <p className="mt-1 mb-0 text-[13px] leading-[1.45] text-t4">
            {description ??
              (oneTime
                ? "Book online — we'll email within one business day to schedule."
                : "Subscribe online and start today. Cancel anytime.")}
          </p>
        </div>
        <span className="shrink-0 pt-0.5 text-[15px] font-semibold text-t2 tabular-nums">
          {netLabel}
        </span>
      </div>

      {!oneTime ? (
        <div
          role="group"
          aria-label="Billing period"
          className="mt-4 inline-flex border border-line-3 bg-surface"
        >
          <button
            type="button"
            onClick={() => {
              setBilling("monthly");
              dropPromo();
            }}
            aria-pressed={!annual}
            disabled={busy}
            className={`bill-btn${!annual ? " is-on" : ""}`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => {
              setBilling("annual");
              dropPromo();
            }}
            aria-pressed={annual}
            disabled={busy}
            className={`bill-btn${annual ? " is-on" : ""}`}
          >
            Annual · save 2 mo
          </button>
        </div>
      ) : null}

      {/* The amount, as an order-summary row rather than a price banner. The
          period lives in the label on the left, so the number carries no
          trailing "/ mo" and the two sides align on one baseline.

          Where tax applies (GST for an IN buyer) the net and the tax are shown
          as their own rows above the total, because the listed price excludes
          them — a bare "Total" over a number that is about to grow by 18% in
          the Razorpay sheet is the one thing this panel must not do. */}
      <div className="mt-4 border-t border-line pt-4" aria-live="polite">
        {/* Subtotal and tax are ALWAYS rendered, taxed or not. A row that
            appears only for Indian buyers meant everyone else got a bare total
            and nothing to reconcile against the "excl. VAT" the pricing card
            showed them a click earlier — silence reads as an omission rather
            than an answer. Both rows come from the same TAX_RULES table that
            decides the charge, so the wording cannot drift from what is billed.

            "None added" is scoped to OUR charge on purpose: it says nothing
            about whether the buyer self-accounts for VAT at their end, which is
            not ours to assert. */}
        <dl className="m-0 flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="m-0 text-[13px] text-t4">Subtotal</dt>
            <dd className="m-0 text-[13px] text-t3 tabular-nums">{netLabel}</dd>
          </div>
          {charge.discountMinor > 0 && applied ? (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="m-0 flex min-w-0 items-baseline gap-2 text-[13px] text-lime">
                <span className="truncate">{applied.code}</span>
                <button
                  type="button"
                  onClick={() => setApplied(null)}
                  className="ease-brand shrink-0 font-mono text-[10px] tracking-[0.08em] text-t5 uppercase transition-colors duration-160 hover:text-danger"
                >
                  Remove
                </button>
              </dt>
              <dd className="m-0 text-[13px] text-lime tabular-nums">
                {discountLabel}
              </dd>
            </div>
          ) : null}
          <div className="flex items-baseline justify-between gap-3">
            {/* Named per region, so a zero still says WHICH tax is zero — an
                EU buyer reads "VAT", matching the "excl. VAT" the pricing card
                showed them, rather than a generic "Tax". */}
            <dt className="m-0 text-[13px] text-t4">
              {charge.taxLabel ?? charge.taxName}
            </dt>
            <dd className="m-0 text-[13px] text-t3 tabular-nums">
              {charge.taxLabel ? taxLabel : "None added"}
            </dd>
          </div>
        </dl>

        {/* Behind a disclosure, not always open. Most buyers have no code, and
            an empty input sitting in a payment card invites the feeling that
            you are missing a deal you should have found. Closed by default; one
            click for anyone who was actually given one. */}
        {!applied ? (
          <div className="mt-3">
            {promoOpen ? (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <label htmlFor="promo-code" className="sr-only">
                    Promo code
                  </label>
                  <input
                    id="promo-code"
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    // Enter applies rather than submitting anything — the panel
                    // is not a form, and the pay control must stay the only way
                    // to reach a charge.
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void applyPromo();
                      }
                    }}
                    placeholder="Promo code"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    disabled={promoBusy}
                    className="ease-brand min-w-0 flex-1 border border-line-3 bg-surface px-3 py-2 font-mono text-[12px] tracking-[0.06em] text-t2 uppercase transition-colors duration-160 placeholder:text-t6 placeholder:normal-case focus:border-lime focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void applyPromo()}
                    disabled={promoBusy || !promoInput.trim()}
                    className="ease-brand shrink-0 border border-line-3 px-3 py-2 font-mono text-[11px] font-bold tracking-[0.1em] text-t3 uppercase transition-colors duration-160 hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {promoBusy ? "…" : "Apply"}
                  </button>
                </div>
                {promoError ? (
                  <p role="alert" className="m-0 text-[12px] leading-[1.4] text-danger">
                    {promoError}
                  </p>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPromoOpen(true)}
                className="ease-brand -my-1 py-1 font-mono text-[11px] tracking-[0.08em] text-t5 uppercase transition-colors duration-160 hover:text-lime"
              >
                Have a promo code?
              </button>
            )}
          </div>
        ) : null}

        <div
          id="checkout-total"
          className="mt-3 flex items-baseline justify-between gap-3 border-t border-line pt-3"
        >
          <span className="font-mono text-[11px] font-bold tracking-[0.12em] text-t5 uppercase">
            {`Total${period || " due"}`}
          </span>
          {/* Clamped: gross with paise ("₹58,998.82") is four glyphs longer than
              a listed price and has to clear the label on a 335px mobile panel. */}
          <span className="font-display text-[clamp(24px,5vw,29px)] leading-none font-bold tracking-[-0.02em] tabular-nums">
            {headline}
          </span>
        </div>
        {/* Reserved so the button doesn't jump when the note appears on the
            annual toggle — but only where a toggle exists. A one-time tier can
            never show a note, so reserving for it is just dead space under the
            price. */}
        {!oneTime ? (
          <div className="mt-1.5 h-3.5 text-right font-mono text-[11px] tracking-[0.04em] text-lime">
            {annual && annualNote ? annualNote : ""}
          </div>
        ) : null}
      </div>

      {/* Slide to pay. Still a real button underneath — click and Enter/Space
          confirm — so the gesture adds tactility without becoming the only way
          to reach the charge. */}
      <SlideToPay
        // No amount in the label. It was here for the usual "confirm what you
        // are committing to" reason, but the total sits twenty pixels above in
        // 29px type and this repeated it at 15px — one number, said twice, in a
        // 400px card. The control names the gesture; the summary names the
        // price. Visible text and accessible name still match, so WCAG 2.5.3
        // (Label in Name) holds, and `describedBy` carries the amount to anyone
        // who tabs straight here without reading the summary.
        label="Slide to pay"
        busyLabel={status === "verifying" ? "Confirming…" : "Starting…"}
        busy={busy}
        describedBy="checkout-total"
        onConfirm={() => void pay()}
      />

      {status === "error" && error ? (
        <p role="alert" className="mt-3 mb-0 text-[13px] leading-[1.5] text-danger">
          {error}
        </p>
      ) : null}

      {/* Trust + branding footer, directly under the button where the hesitation
          actually happens. The security claims are true (Razorpay is PCI-DSS
          Level 1) and the card-data line is real — their JS, not ours, handles
          the card. The "Powered by Razorpay" credit below is the branding
          Razorpay asks merchants to show. */}
      {/* Accepted marks pair with the Razorpay credit on one line — both answer
          "who takes my money and how", and neither earns a row of its own.
          The credit is the real wordmark now, not typeset caps: it sits beside
          four genuine brand marks, and the one lockup that was faked was the
          one naming who actually holds the card. */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2.5 border-t border-line pt-3.5 xs:justify-between">
        <PaymentMarks region={region} />
        <span className="inline-flex items-center gap-1.5">
          {/* Sentence case, body font. The mono + 0.12em tracking this replaces
              is the site's label voice, and it exists to hold uppercase apart —
              set in sentence case it just looks loose, and it fought the
              wordmark beside it. 11px t5 matches the trust line above. */}
          <span className="text-[11px] leading-none text-t5">Powered by</span>
          {/* eslint-disable-next-line @next/next/no-img-element -- see PaymentMarks */}
          <img
            src="/payment/razorpay.svg"
            alt="Razorpay"
            width={66}
            height={14}
            className="block h-3.5 w-auto"
          />
        </span>
      </div>
    </div>

      {/* Security note, OUTSIDE the card. Inside, it competed with the summary
          rows for the same visual weight while saying something that is context
          rather than order detail — the card is what you are buying and paying;
          this is the ground it stands on. Set as a caption in the site's mono
          label voice, where the uppercase tracking earns its keep, so it reads
          as a seal rather than another sentence in the receipt.

          No padlock. A stroked lock glyph is mud at 12px, and a padlock is the
          most worn trust cliché there is — nothing else on this site captions
          itself with a utility icon. The words carry it.

          Kept to ONE line on purpose: 47 characters at 10px mono plus 0.08em
          tracking is ~320px, inside the 350px the panel gets on a phone. The
          previous wording ran 62 and wrapped, and a two-line caption under a
          card reads as a paragraph that got away rather than a seal. "We never
          see your card details" rather than "never touch Myndstack" — shorter,
          and it avoids "us" reading as the US region three rows above. */}
      <p className="mt-3.5 mb-0 text-center font-mono text-[10px] leading-[1.5] tracking-[0.08em] text-t5 uppercase xs:text-left">
        PCI-DSS Level&nbsp;1 · we never see your card details
      </p>
    </>
  );
}
