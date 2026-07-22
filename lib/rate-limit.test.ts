import { describe, expect, it } from "vitest";
import { clientIp, rateLimit } from "./rate-limit";

/** Unique key per test so the module-level window doesn't leak between them. */
let counter = 0;
const freshKey = () => `test-${counter++}`;

const request = (headers: Record<string, string>) =>
  new Request("https://example.com", { headers });

describe("rateLimit", () => {
  it("allows the first five and blocks the sixth", () => {
    const key = freshKey();
    for (let i = 0; i < 5; i++) expect(rateLimit(key).ok).toBe(true);
    expect(rateLimit(key).ok).toBe(false);
  });

  it("reports a positive retry delay when blocked", () => {
    const key = freshKey();
    for (let i = 0; i < 5; i++) rateLimit(key);

    const blocked = rateLimit(key);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
    expect(blocked.retryAfter).toBeLessThanOrEqual(60);
  });

  it("tracks callers independently", () => {
    const a = freshKey();
    const b = freshKey();
    for (let i = 0; i < 5; i++) rateLimit(a);

    expect(rateLimit(a).ok).toBe(false);
    expect(rateLimit(b).ok).toBe(true);
  });
});

describe("clientIp", () => {
  it("takes the hop the trusted proxy appended, not the spoofable head", () => {
    // Everything left of the trusted hop is attacker-supplied; reading the
    // leftmost value would let anyone rotate it to dodge the limit.
    const ip = clientIp(
      request({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 203.0.113.9" }),
    );
    expect(ip).toBe("203.0.113.9");
  });

  it("handles a single entry", () => {
    expect(clientIp(request({ "x-forwarded-for": "203.0.113.9" }))).toBe("203.0.113.9");
  });

  it("tolerates whitespace and empty segments", () => {
    expect(clientIp(request({ "x-forwarded-for": " , 203.0.113.9 , " }))).toBe(
      "203.0.113.9",
    );
  });

  it("falls back to x-real-ip", () => {
    expect(clientIp(request({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
  });

  it("degrades to a shared bucket when no header is present", () => {
    expect(clientIp(request({}))).toBe("unknown");
  });
});
