import "server-only";

/**
 * Cloudflare Turnstile server-side verification.
 *
 * The token a browser widget produces is single-use and must be validated
 * against Cloudflare before a request is trusted — the client can claim
 * anything. This module never runs on the client (the secret must not ship in
 * the bundle), hence `server-only`.
 */

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Fail closed if siteverify hasn't answered by here — a hung dependency must
 *  not hold a form request open, and an unanswered challenge is not a pass. */
const TIMEOUT_MS = 5_000;

/** The subset of the siteverify response we rely on, typed explicitly. */
type SiteverifyResponse = {
  readonly success: boolean;
  readonly "error-codes"?: readonly string[];
  readonly challenge_ts?: string;
  readonly hostname?: string;
  readonly action?: string;
  readonly cdata?: string;
};

/** The verdict returned to callers. */
export type TurnstileResult = {
  readonly success: boolean;
  readonly errorCodes?: readonly string[];
};

/** Whether Turnstile is wired up in this environment (secret present). Routes
 *  enforce verification only when it is, so local dev / e2e without keys still
 *  run; production and preview must set the secret (see the deploy note). */
export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

/**
 * Verifies a Turnstile token. Fails closed on every uncertainty — no secret, no
 * token, a timeout, a network error, or a non-200 from Cloudflare all return
 * `success: false`. The token is verified exactly once (it is single-use; a
 * retry would only ever be rejected as a duplicate).
 *
 * @param token    the `cf-turnstile-response` value from the client
 * @param remoteip the visitor's IP, forwarded to Cloudflare as a signal; a value
 *                 of "unknown" (see `clientIp`) is omitted rather than sent
 */
export async function verifyTurnstile(
  token: string,
  remoteip: string,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error("Turnstile: TURNSTILE_SECRET_KEY is not set — failing closed.");
    return { success: false };
  }
  if (!token) return { success: false };

  const body = new URLSearchParams({ secret, response: token });
  if (remoteip && remoteip !== "unknown") body.set("remoteip", remoteip);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      body,
      signal: controller.signal,
    });

    if (!response.ok) return { success: false };

    const data = (await response.json()) as SiteverifyResponse;
    return { success: data.success === true, errorCodes: data["error-codes"] };
  } catch {
    // Timeout (abort) or network error — an unverified token is not a pass.
    return { success: false };
  } finally {
    clearTimeout(timer);
  }
}
