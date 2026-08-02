import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `turnstile.ts` is server-only; stub the marker so it imports under vitest.
vi.mock("server-only", () => ({}));

import { verifyTurnstile } from "@/lib/turnstile";

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const originalFetch = globalThis.fetch;
const originalSecret = process.env.TURNSTILE_SECRET_KEY;

beforeEach(() => {
  process.env.TURNSTILE_SECRET_KEY = "test-secret-key";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = originalSecret;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("verifyTurnstile", () => {
  it("rejects an empty token without a wasted round trip to siteverify", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await verifyTurnstile("", "203.0.113.7");

    expect(result.success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("verifies a valid token, POSTing secret, response and remoteip to siteverify", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ success: true, hostname: "myndstack.io", challenge_ts: "2020-01-01T00:00:00Z" }),
      );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await verifyTurnstile("good-token", "203.0.113.7");

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(SITEVERIFY);
    expect(init.method).toBe("POST");

    const body = init.body as URLSearchParams;
    expect(body.get("secret")).toBe("test-secret-key");
    expect(body.get("response")).toBe("good-token");
    expect(body.get("remoteip")).toBe("203.0.113.7");
  });

  it("rejects a token siteverify reports as invalid", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ success: false, "error-codes": ["invalid-input-response"] }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await verifyTurnstile("bad-token", "203.0.113.7");

    expect(result.success).toBe(false);
    expect(result.errorCodes).toContain("invalid-input-response");
  });

  it("fails closed when siteverify times out (request aborted)", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new DOMException("The operation was aborted.", "AbortError")) as unknown as typeof fetch;

    const result = await verifyTurnstile("some-token", "203.0.113.7");

    expect(result.success).toBe(false);
  });

  it("fails closed when siteverify never responds — the internal timeout aborts it", async () => {
    vi.useFakeTimers();
    // A fetch that resolves only if aborted — exercises the real
    // AbortController + setTimeout wiring, not a pre-rejected mock. If the
    // timeout were removed this promise would hang and the test would fail.
    const fetchMock = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("The operation was aborted.", "AbortError")),
          );
        }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const pending = verifyTurnstile("some-token", "203.0.113.7");
    await vi.advanceTimersByTimeAsync(6_000); // past the 5s internal timeout
    const result = await pending;

    expect(result.success).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails closed on a non-200 from siteverify", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({}, 500)) as unknown as typeof fetch;

    const result = await verifyTurnstile("some-token", "203.0.113.7");

    expect(result.success).toBe(false);
  });

  it("does not retry — a token is single-use, so it verifies exactly once", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ success: false, "error-codes": ["timeout-or-duplicate"] }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await verifyTurnstile("some-token", "203.0.113.7");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails closed and never calls siteverify when the secret is not configured", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await verifyTurnstile("some-token", "203.0.113.7");

    expect(result.success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("omits remoteip when the client IP is unknown", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await verifyTurnstile("good-token", "unknown");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = init.body as URLSearchParams;
    expect(body.has("remoteip")).toBe(false);
  });
});
