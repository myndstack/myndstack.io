/**
 * How mail leaves this process, resolved from the environment.
 *
 * Pulled out of `mail.ts` so the rules are a pure function of `env` and can be
 * unit-tested — the same shape as `rate-limit.ts`, and for the same reason: this
 * is the config that decides whether a lead reaches a human, and it used to be
 * discoverable only by submitting a form in production and reading the 502.
 *
 * Deliberately free of `server-only`: `instrumentation.ts` sits outside the app
 * tree and imports this at boot.
 */

export type MailStatus =
  /** A verified sender and a key. Mail reaches a person. */
  | { state: "deliverable"; transport: "resend"; apiKey: string; from: string; to: string }
  /** Valid, but the message is logged rather than sent. Nobody receives it. */
  | { state: "logging"; transport: "console"; reason: "explicit" | "no-key-in-dev"; to: string }
  /** Misconfigured. Submissions will fail rather than be silently dropped. */
  | { state: "broken"; problems: string[] };

/**
 * Resend's shared testing sender. It only delivers to your own Resend account
 * address, so it is a development convenience and never a production sender.
 */
const TESTING_SENDER = "resend.dev";

/** Matches SITE.email. Kept as a literal so the boot path doesn't pull in content.ts. */
const DEFAULT_TO = "hello@myndstack.io";
const DEFAULT_FROM = `Myndstack <onboarding@${TESTING_SENDER}>`;

export function resolveMailStatus(env: NodeJS.ProcessEnv = process.env): MailStatus {
  const declared = env.MAIL_TRANSPORT?.trim();
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.CONTACT_FROM_EMAIL?.trim();
  const to = env.CONTACT_TO_EMAIL?.trim() || DEFAULT_TO;
  const isProduction = env.NODE_ENV === "production";

  // An unrecognised value used to fall through to inference-from-key, so a typo
  // like `Console` or `smtp` quietly became something else and surfaced later as
  // an unexplained 502. Name the value instead.
  if (declared && declared !== "console" && declared !== "resend") {
    return {
      state: "broken",
      problems: [`MAIL_TRANSPORT is "${declared}" — expected "console" or "resend".`],
    };
  }

  // An explicitly-chosen console transport is valid anywhere. CI, the e2e suite
  // and local development all run *production builds* against it on purpose, so
  // this must never be treated as a misconfiguration.
  if (declared === "console") {
    return { state: "logging", transport: "console", reason: "explicit", to };
  }

  const problems: string[] = [];

  if (!apiKey) {
    problems.push(
      declared === "resend"
        ? "MAIL_TRANSPORT=resend but RESEND_API_KEY is not set."
        : "RESEND_API_KEY is not set.",
    );
  }

  // The sender is only policed in production. Its fallback is wrong rather than
  // merely absent — shipping it means mail that is rejected or filed as spam —
  // whereas the recipient fallback is this company's real inbox and needs no guard.
  if (isProduction) {
    if (!from) {
      problems.push(
        `CONTACT_FROM_EMAIL is not set — the fallback sender is ${TESTING_SENDER}, which cannot deliver to customers.`,
      );
    } else if (from.includes(TESTING_SENDER)) {
      problems.push(
        `CONTACT_FROM_EMAIL uses ${TESTING_SENDER}. Verify a domain in Resend and send from an address on it.`,
      );
    }
  }

  if (!apiKey || problems.length) {
    // Outside production a missing key is not a failure: it is how the site runs
    // before anyone has one, and the message still gets logged. An explicit
    // MAIL_TRANSPORT=resend is a different matter — that asked to send.
    if (!isProduction && declared !== "resend") {
      return { state: "logging", transport: "console", reason: "no-key-in-dev", to };
    }
    return { state: "broken", problems };
  }

  return { state: "deliverable", transport: "resend", apiKey, from: from ?? DEFAULT_FROM, to };
}
