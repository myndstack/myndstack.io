import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { HONEYPOT_FIELD, TURNSTILE_RESPONSE_FIELD } from "@/lib/form-shared";
import type { Mail } from "@/lib/mail";

// `form-route.ts` is server-only; stub the marker so it imports under vitest.
vi.mock("server-only", () => ({}));

// Isolate the handler from its real dependencies so the tests assert only the
// gating logic and side-effect discipline — never the network, mail or CRM.
const sendFormMail = vi.fn();
vi.mock("@/lib/mail", () => ({ sendFormMail: (mail: unknown) => sendFormMail(mail) }));

const verifyTurnstile = vi.fn();
const isTurnstileConfigured = vi.fn(() => true);
vi.mock("@/lib/turnstile", () => ({
  verifyTurnstile: (token: string, ip: string) => verifyTurnstile(token, ip),
  isTurnstileConfigured: () => isTurnstileConfigured(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: () => ({ ok: true, retryAfter: 0 }),
  clientIp: () => "203.0.113.7",
}));

vi.mock("@/lib/content", () => ({ SITE: { email: "hello@myndstack.io" } }));

import { handleFormSubmission } from "@/lib/form-route";

const schema = z.object({ email: z.email() });
const buildMail = (data: { readonly email: string }): Mail => ({
  subject: `Test — ${data.email}`,
  replyTo: data.email,
  fields: [["Email", data.email]],
});

function post(body: Record<string, unknown>): Request {
  return new Request("https://myndstack.io/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const withTurnstile = { requireTurnstile: true } as const;

beforeEach(() => {
  sendFormMail.mockReset().mockResolvedValue({ ok: true });
  verifyTurnstile.mockReset();
  isTurnstileConfigured.mockReset().mockReturnValue(true);
});

afterEach(() => vi.restoreAllMocks());

describe("handleFormSubmission — Turnstile gating", () => {
  it("silently accepts a honeypot hit: 200, no mail, no sinks, no verification", async () => {
    verifyTurnstile.mockResolvedValue({ success: true });
    const sink = vi.fn().mockResolvedValue(undefined);

    const res = await handleFormSubmission(
      post({ email: "a@b.co", [HONEYPOT_FIELD]: "i-am-a-bot", [TURNSTILE_RESPONSE_FIELD]: "tok" }),
      schema,
      buildMail,
      [sink],
      withTurnstile,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(sendFormMail).not.toHaveBeenCalled();
    expect(sink).not.toHaveBeenCalled();
    expect(verifyTurnstile).not.toHaveBeenCalled();
  });

  it("verifies before schema validation — a failed check pre-empts field errors", async () => {
    verifyTurnstile.mockResolvedValue({ success: false });

    // Body is BOTH schema-invalid (bad email) and has a bad token. If the schema
    // ran first we'd get fieldErrors; the generic verification error proves the
    // Turnstile gate runs before — and instead of — schema validation.
    const res = await handleFormSubmission(
      post({ email: "not-an-email", [TURNSTILE_RESPONSE_FIELD]: "bad" }),
      schema,
      buildMail,
      [],
      withTurnstile,
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Verification failed. Please try again.");
    expect(json.fieldErrors).toBeUndefined();
    expect(sendFormMail).not.toHaveBeenCalled();
  });

  it("rejects a missing token with a generic 400 and no processing", async () => {
    // A missing token is an empty string to the verifier, which rejects it.
    verifyTurnstile.mockResolvedValue({ success: false });

    const res = await handleFormSubmission(post({ email: "a@b.co" }), schema, buildMail, [], withTurnstile);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(typeof json.error).toBe("string");
    // Must not leak *why* it failed.
    expect(json.error.toLowerCase()).not.toContain("token");
    expect(verifyTurnstile).toHaveBeenCalledWith("", "203.0.113.7");
    expect(sendFormMail).not.toHaveBeenCalled();
  });

  it("rejects an invalid/timed-out token (verify → false) with 400 and no processing", async () => {
    verifyTurnstile.mockResolvedValue({ success: false });

    const res = await handleFormSubmission(
      post({ email: "a@b.co", [TURNSTILE_RESPONSE_FIELD]: "bad" }),
      schema,
      buildMail,
      [],
      withTurnstile,
    );

    expect(res.status).toBe(400);
    expect(sendFormMail).not.toHaveBeenCalled();
  });

  it("processes normally on a valid token, passing the client IP as remoteip", async () => {
    verifyTurnstile.mockResolvedValue({ success: true });

    const res = await handleFormSubmission(
      post({ email: "a@b.co", [TURNSTILE_RESPONSE_FIELD]: "good" }),
      schema,
      buildMail,
      [],
      withTurnstile,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(verifyTurnstile).toHaveBeenCalledWith("good", "203.0.113.7");
    expect(sendFormMail).toHaveBeenCalledTimes(1);
  });

  it("skips verification (and still processes) when Turnstile is not configured", async () => {
    isTurnstileConfigured.mockReturnValue(false);

    const res = await handleFormSubmission(post({ email: "a@b.co" }), schema, buildMail, [], withTurnstile);

    expect(res.status).toBe(200);
    expect(verifyTurnstile).not.toHaveBeenCalled();
    expect(sendFormMail).toHaveBeenCalledTimes(1);
  });

  it("does not verify at all when a route opts out of Turnstile", async () => {
    const res = await handleFormSubmission(post({ email: "a@b.co" }), schema, buildMail);

    expect(res.status).toBe(200);
    expect(verifyTurnstile).not.toHaveBeenCalled();
    expect(sendFormMail).toHaveBeenCalledTimes(1);
  });
});
