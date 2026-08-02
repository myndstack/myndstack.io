"use client";

import { useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile, rendered explicitly so we own its lifecycle (render on
 * script load, reset for a fresh single-use token, remove on unmount). Managed
 * mode is set in the Cloudflare dashboard; `appearance: "interaction-only"`
 * keeps the widget invisible unless a challenge is actually needed.
 *
 * The widget injects its own hidden `cf-turnstile-response` input into the
 * enclosing <form>, so the token rides along in FormData; the `onToken` callback
 * is only for the form's own UI (enable submit, surface errors).
 */

type RenderOptions = {
  readonly sitekey: string;
  readonly callback: (token: string) => void;
  readonly "error-callback": () => void;
  readonly "expired-callback": () => void;
  readonly appearance?: "always" | "execute" | "interaction-only";
  readonly theme?: "auto" | "light" | "dark";
};

type TurnstileApi = {
  readonly render: (container: HTMLElement, options: RenderOptions) => string;
  readonly reset: (widgetId: string) => void;
  readonly remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    onTurnstileLoad?: () => void;
  }
}

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad";
/** If the API object never appears, treat the widget as failed to load. */
const LOAD_TIMEOUT_MS = 10_000;

type Props = {
  readonly siteKey: string;
  /** Token when solved; null when reset, expired, or errored. */
  readonly onToken: (token: string | null) => void;
  /** The script or an explicit render failed — the form should degrade. */
  readonly onError: () => void;
  /** Bump to force a fresh challenge after a failed submit (tokens are single-use). */
  readonly resetSignal: number;
};

export default function TurnstileWidget({ siteKey, onToken, onError, resetSignal }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Latest callbacks, read from inside long-lived listeners without re-rendering
  // the widget when the parent re-renders.
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onTokenRef.current = onToken;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;

    const render = () => {
      if (cancelled || widgetIdRef.current || !window.turnstile || !containerRef.current) return;
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          appearance: "interaction-only",
          theme: "auto",
          callback: (token) => onTokenRef.current(token),
          "error-callback": () => {
            onTokenRef.current(null);
            onErrorRef.current();
          },
          "expired-callback": () => onTokenRef.current(null),
        });
      } catch {
        onErrorRef.current();
      }
    };

    if (window.turnstile) {
      render();
    } else {
      window.onTurnstileLoad = render;
      let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        script.addEventListener("error", () => onErrorRef.current());
        document.head.appendChild(script);
      }
    }

    // Network-blocked / never-loads fallback so the form doesn't wait forever.
    const timeout = window.setTimeout(() => {
      if (!cancelled && !window.turnstile) onErrorRef.current();
    }, LOAD_TIMEOUT_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Already gone — nothing to clean up.
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  // A failed submit consumes the token; ask for a fresh challenge.
  useEffect(() => {
    if (resetSignal === 0 || !widgetIdRef.current || !window.turnstile) return;
    try {
      window.turnstile.reset(widgetIdRef.current);
      onTokenRef.current(null);
    } catch {
      // If reset throws the widget is unusable; let the form surface the error.
      onErrorRef.current();
    }
  }, [resetSignal]);

  // No `aria-hidden`: in managed / interaction-only mode Cloudflare can escalate
  // to a VISIBLE interactive challenge, which must stay in the accessibility tree
  // so assistive-tech users can complete it. It is invisible until then anyway.
  return <div ref={containerRef} className="empty:m-0 mt-1" />;
}
