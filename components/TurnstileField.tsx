"use client";

import type { TurnstileGate } from "@/lib/hooks";
import TurnstileWidget from "./TurnstileWidget";

type Props = {
  readonly siteKey: string;
  readonly gate: TurnstileGate;
  /** Shown in the "couldn't load" fallback so people can still reach a human. */
  readonly email: string;
  readonly className?: string;
};

/**
 * The Turnstile widget plus its status messages — the shared block every gated
 * form drops in. Renders nothing when Turnstile isn't configured (no site key),
 * so unconfigured environments (local dev / e2e) simply omit it.
 */
export default function TurnstileField({ siteKey, gate, email, className = "" }: Props) {
  if (!gate.enabled) return null;

  return (
    <div className={className}>
      <TurnstileWidget
        siteKey={siteKey}
        onToken={gate.handleToken}
        onError={gate.onWidgetError}
        resetSignal={gate.resetSignal}
      />

      {gate.widgetFailed ? (
        <p
          role="alert"
          className="m-0 mt-3 border border-danger/40 bg-danger/8 px-4 py-3 font-mono text-[11.5px] text-danger"
        >
          Verification couldn&rsquo;t load. Disable any blockers and refresh, or email
          us directly at <a href={`mailto:${email}`}>{email}</a>.
        </p>
      ) : gate.needsVerify && !gate.token ? (
        <p role="status" className="m-0 mt-3 font-mono text-[11.5px] text-t4">
          One moment — complete the verification just above, then send.
        </p>
      ) : null}
    </div>
  );
}
