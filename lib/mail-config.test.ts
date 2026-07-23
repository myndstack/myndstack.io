import { describe, expect, it } from "vitest";

import { resolveMailStatus } from "./mail-config";

/**
 * The regression these exist for: a production deployment with no key looked
 * healthy everywhere — CI green, build green, site up — and only failed when a
 * real person submitted the contact form. These pin the rules that decide it.
 */

const KEY = "re_test_key";
const FROM = "Myndstack <hello@myndstack.io>";

describe("resolveMailStatus", () => {
  it("accepts an explicit console transport in production", () => {
    // CI and the e2e suite run production builds against exactly this.
    const status = resolveMailStatus({
      NODE_ENV: "production",
      MAIL_TRANSPORT: "console",
    });

    expect(status).toMatchObject({ state: "logging", reason: "explicit" });
  });

  it("logs rather than fails when there is no key outside production", () => {
    const status = resolveMailStatus({ NODE_ENV: "development" });

    expect(status).toMatchObject({ state: "logging", reason: "no-key-in-dev" });
  });

  it("breaks on a production deployment with an empty environment", () => {
    const status = resolveMailStatus({ NODE_ENV: "production" });

    expect(status.state).toBe("broken");
    if (status.state !== "broken") return;
    expect(status.problems.join(" ")).toContain("RESEND_API_KEY");
  });

  it("reports every problem at once rather than one deploy at a time", () => {
    const status = resolveMailStatus({ NODE_ENV: "production" });

    if (status.state !== "broken") throw new Error("expected broken");
    expect(status.problems).toHaveLength(2);
    expect(status.problems.join(" ")).toContain("CONTACT_FROM_EMAIL");
  });

  it("rejects the shared testing sender in production", () => {
    const status = resolveMailStatus({
      NODE_ENV: "production",
      RESEND_API_KEY: KEY,
      CONTACT_FROM_EMAIL: "Myndstack <onboarding@resend.dev>",
    });

    expect(status.state).toBe("broken");
    if (status.state !== "broken") return;
    expect(status.problems.join(" ")).toContain("resend.dev");
  });

  it("rejects an unset sender in production, where the fallback is resend.dev", () => {
    const status = resolveMailStatus({ NODE_ENV: "production", RESEND_API_KEY: KEY });

    expect(status.state).toBe("broken");
  });

  it("breaks when resend is asked for explicitly but no key exists", () => {
    // Even in development: this configuration asked to send and cannot.
    const status = resolveMailStatus({
      NODE_ENV: "development",
      MAIL_TRANSPORT: "resend",
    });

    expect(status.state).toBe("broken");
  });

  it("breaks on an unrecognised transport instead of inferring one", () => {
    // The old ternary fell through to `apiKey ? resend : console`, so a capital
    // C silently became something else and surfaced later as an opaque 502.
    const status = resolveMailStatus({
      NODE_ENV: "production",
      MAIL_TRANSPORT: "Console",
      RESEND_API_KEY: KEY,
      CONTACT_FROM_EMAIL: FROM,
    });

    expect(status.state).toBe("broken");
    if (status.state !== "broken") return;
    expect(status.problems[0]).toContain('"Console"');
  });

  it("is deliverable with a key and a sender on a real domain", () => {
    const status = resolveMailStatus({
      NODE_ENV: "production",
      RESEND_API_KEY: KEY,
      CONTACT_FROM_EMAIL: FROM,
      CONTACT_TO_EMAIL: "leads@myndstack.io",
    });

    expect(status).toEqual({
      state: "deliverable",
      transport: "resend",
      apiKey: KEY,
      from: FROM,
      to: "leads@myndstack.io",
    });
  });

  it("falls back to the company inbox when no recipient is set", () => {
    // Unlike the sender, this default is correct — it is the address in SITE.
    const status = resolveMailStatus({
      NODE_ENV: "production",
      RESEND_API_KEY: KEY,
      CONTACT_FROM_EMAIL: FROM,
    });

    expect(status).toMatchObject({ state: "deliverable", to: "hello@myndstack.io" });
  });

  it("sends real mail in development once a key is present", () => {
    const status = resolveMailStatus({ NODE_ENV: "development", RESEND_API_KEY: KEY });

    expect(status).toMatchObject({ state: "deliverable", transport: "resend" });
  });
});
