"use client";

import { useTurnstileGate } from "@/lib/hooks";
import { useFormPost } from "@/lib/useFormPost";
import { Honeypot } from "./Field";
import Icon from "./Icon";
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
        className="mt-2 font-mono text-11 tracking-[0.04em] text-lime"
      >
        ▸ Subscribed. Watch your inbox.
      </div>
    );
  }

  const message =
    fieldErrors.email ??
    (gate.needsVerify ? "Complete the verification just above, then subscribe." : null) ??
    (gate.widgetFailed ? "Verification couldn't load. Refresh the page, or email us directly." : null) ??
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
            className="ms-field min-h-11 flex-1 border-none bg-transparent px-4 py-0"
          />
          <button
            type="submit"
            disabled={pending || (gate.enabled && gate.widgetFailed)}
            aria-label={pending ? "Subscribing" : "Subscribe"}
            className="flex cursor-pointer items-center border-none bg-lime px-4 font-mono text-15 font-bold text-lime-ink disabled:opacity-60"
          >
            {pending ? "…" : <Icon name="arrow-right" className="size-4" />}
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
        <p id="newsletter-error" role="alert" className="mt-2 mb-0 font-mono text-11 text-danger">
          {message}
        </p>
      ) : null}
    </div>
  );
}
