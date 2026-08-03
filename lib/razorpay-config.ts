/**
 * How Razorpay is wired, resolved from the environment.
 *
 * A pure function of `env` — the same shape and rationale as mail-config.ts —
 * so the rules that decide whether a charge can happen are unit-testable and
 * not discovered by hitting /api/checkout in production. Deliberately free of
 * `server-only`: only the secret-*using* code (lib/razorpay.ts) is server-only;
 * this module just classifies env and is safe to unit-test in the node runtime.
 *
 * The public key id (rzp_test_… / rzp_live_…) is returned to the browser to open
 * Checkout; the key secret and webhook secret never leave the server.
 */

export type RazorpayMode = "test" | "live";

export type RazorpayStatus =
  /** Everything needed to create + verify a charge is present. */
  | {
      state: "ready";
      mode: RazorpayMode;
      keyId: string;
      keySecret: string;
      /**
       * Absent means webhooks cannot be verified — orders still work, but the
       * webhook route must reject everything. Tracked separately so the order
       * path is not blocked by a missing webhook secret during bring-up.
       */
      webhookSecret: string | null;
    }
  /** Not wired up. Checkout is off; the pricing surface falls back to contact. */
  | { state: "unconfigured"; problems: string[] }
  /** Present but inconsistent (e.g. the key id has no recognised prefix). */
  | { state: "broken"; problems: string[] };

const TEST_PREFIX = "rzp_test_";
const LIVE_PREFIX = "rzp_live_";

export function resolveRazorpayStatus(
  env: NodeJS.ProcessEnv = process.env,
): RazorpayStatus {
  const keyId = env.RAZORPAY_KEY_ID?.trim();
  const keySecret = env.RAZORPAY_KEY_SECRET?.trim();
  const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET?.trim() || null;

  const problems: string[] = [];
  if (!keyId) problems.push("RAZORPAY_KEY_ID is not set.");
  if (!keySecret) problems.push("RAZORPAY_KEY_SECRET is not set.");
  if (!keyId || !keySecret) return { state: "unconfigured", problems };

  const mode: RazorpayMode | null = keyId.startsWith(LIVE_PREFIX)
    ? "live"
    : keyId.startsWith(TEST_PREFIX)
      ? "test"
      : null;

  if (mode === null) {
    return {
      state: "broken",
      problems: [
        `RAZORPAY_KEY_ID must start with "${TEST_PREFIX}" or "${LIVE_PREFIX}".`,
      ],
    };
  }

  return { state: "ready", mode, keyId, keySecret, webhookSecret };
}

/** Whether a charge can be created and verified in this environment. */
export function isRazorpayConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return resolveRazorpayStatus(env).state === "ready";
}
