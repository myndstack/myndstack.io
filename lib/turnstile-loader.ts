/**
 * Client-side loader for Cloudflare's Turnstile script, shared by every widget
 * on the page.
 *
 * The script reports readiness through ONE global `onload` callback. When each
 * widget assigned that callback itself, the last widget to mount (the footer
 * newsletter) overwrote the others, and the contact / application forms never
 * rendered a challenge — so they could never submit. One shared promise
 * resolves every caller instead.
 */

type RenderOptions = {
  readonly sitekey: string;
  readonly callback: (token: string) => void;
  readonly "error-callback": () => void;
  readonly "expired-callback": () => void;
  readonly appearance?: "always" | "execute" | "interaction-only";
  readonly theme?: "auto" | "light" | "dark";
};

export type TurnstileApi = {
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

let pending: Promise<TurnstileApi> | null = null;

export function loadTurnstile(timeoutMs: number = LOAD_TIMEOUT_MS): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (pending) return pending;

  pending = new Promise<TurnstileApi>((resolve, reject) => {
    const fail = (reason: string) => {
      clearTimeout(timer);
      // Drop the dead script and the cached promise so a later mount can retry.
      document.getElementById(SCRIPT_ID)?.remove();
      pending = null;
      reject(new Error(reason));
    };

    // Network-blocked / never-loads fallback so forms don't wait forever.
    const timer = setTimeout(() => fail("Turnstile load timed out"), timeoutMs);

    window.onTurnstileLoad = () => {
      clearTimeout(timer);
      if (window.turnstile) resolve(window.turnstile);
      else fail("Turnstile loaded without its API");
    };

    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.addEventListener("error", () => fail("Turnstile script failed to load"));
      document.head.appendChild(script);
    }
  });

  return pending;
}

/** Test hook: forget any in-flight load. */
export function resetTurnstileLoader(): void {
  pending = null;
}
