"use client";

import { useTurnstileGate } from "@/lib/hooks";
import { useFormPost } from "@/lib/useFormPost";
import { Honeypot } from "./Field";
import TurnstileWidget from "./TurnstileWidget";

type Props = {
  /**
   * Cloudflare Turnstile site key. Empty string turns Turnstile off (dev/e2e
   * with no keys); when set, the widget mounts in interaction-only mode and
   * stays invisible until Cloudflare decides a challenge is needed.
   */
  turnstileSiteKey?: string;
};

export default function Newsletter({ turnstileSiteKey = "" }: Props) {
  const { submit, pending, done, error, fieldErrors } = useFormPost(
    "/api/newsletter",
    "newsletter",
  );
  const gate = useTurnstileGate(turnstileSiteKey, error);

  if (done) {
    return (
      <div
        role="status"
        className="mt-2.5 font-mono text-[11px] tracking-[0.04em] text-lime"
      >
        ▸ Subscribed. Watch your inbox.
      </div>
    );
  }

  const message =
    fieldErrors.email ??
    (gate.needsVerify ? "Please complete the challenge before subscribing." : null) ??
    (gate.widgetFailed ? "Verification unavailable. Try again in a moment." : null) ??
    error;

  return (
    <div>
      <form onSubmit={gate.guard(submit)} noValidate className="relative">
        <Honeypot />
        <div
          className={`flex max-w-[300px] border ${message ? "border-danger" : "border-line-3"}`}
        >
          <input
            name="email"
            type="email"
            autoComplete="email"
            disabled={pending}
            aria-label="Email address"
            aria-invalid={message ? true : undefined}
            aria-describedby={message ? "newsletter-error" : undefined}
            placeholder="you@company.com"
            className="ms-field flex-1 border-none bg-transparent px-3.5 py-3"
          />
          <button
            type="submit"
            disabled={pending || (gate.enabled && gate.widgetFailed)}
            aria-label="Subscribe"
            className="cursor-pointer border-none bg-lime px-[18px] font-mono text-[15px] font-bold text-lime-ink disabled:opacity-60"
          >
            {pending ? "…" : "→"}
          </button>
        </div>
        {/* Interaction-only appearance means the widget is a 0×0 element under
            normal traffic and only becomes visible if Cloudflare escalates to
            a real challenge — the footer stays quiet in the common case. */}
        {gate.enabled ? (
          <TurnstileWidget
            siteKey={turnstileSiteKey}
            onToken={gate.handleToken}
            onError={gate.onWidgetError}
            resetSignal={gate.resetSignal}
          />
        ) : null}
      </form>

      {message ? (
        <p id="newsletter-error" role="alert" className="mt-2 mb-0 font-mono text-[11px] text-danger">
          {message}
        </p>
      ) : null}
    </div>
  );
}
