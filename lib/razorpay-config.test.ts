import { describe, expect, it } from "vitest";
import { isRazorpayConfigured, resolveRazorpayStatus } from "./razorpay-config";

const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;
const ready = env({ RAZORPAY_KEY_ID: "rzp_test_abc", RAZORPAY_KEY_SECRET: "secret" });

describe("resolveRazorpayStatus", () => {
  it("is unconfigured when either key is missing or blank", () => {
    expect(resolveRazorpayStatus(env({})).state).toBe("unconfigured");
    expect(resolveRazorpayStatus(env({ RAZORPAY_KEY_ID: "rzp_test_x" })).state).toBe(
      "unconfigured",
    );
    expect(resolveRazorpayStatus(env({ RAZORPAY_KEY_SECRET: "s" })).state).toBe(
      "unconfigured",
    );
    expect(
      resolveRazorpayStatus(env({ RAZORPAY_KEY_ID: "  ", RAZORPAY_KEY_SECRET: "  " }))
        .state,
    ).toBe("unconfigured");
  });

  it("is ready + test mode for a test key, webhook secret null when absent", () => {
    const s = resolveRazorpayStatus(ready);
    expect(s.state).toBe("ready");
    if (s.state === "ready") {
      expect(s.mode).toBe("test");
      expect(s.keyId).toBe("rzp_test_abc");
      expect(s.keySecret).toBe("secret");
      expect(s.webhookSecret).toBeNull();
    }
  });

  it("is ready + live mode for a live key, and carries the webhook secret", () => {
    const s = resolveRazorpayStatus(
      env({
        RAZORPAY_KEY_ID: "rzp_live_abc",
        RAZORPAY_KEY_SECRET: "secret",
        RAZORPAY_WEBHOOK_SECRET: "whsec",
      }),
    );
    expect(s.state).toBe("ready");
    if (s.state === "ready") {
      expect(s.mode).toBe("live");
      expect(s.webhookSecret).toBe("whsec");
    }
  });

  it("is broken when the key id has no recognised prefix", () => {
    const s = resolveRazorpayStatus(
      env({ RAZORPAY_KEY_ID: "bogus_abc", RAZORPAY_KEY_SECRET: "secret" }),
    );
    expect(s.state).toBe("broken");
  });
});

describe("isRazorpayConfigured", () => {
  it("is true only when the status is ready", () => {
    expect(isRazorpayConfigured(ready)).toBe(true);
    expect(isRazorpayConfigured(env({}))).toBe(false);
    expect(
      isRazorpayConfigured(env({ RAZORPAY_KEY_ID: "bogus", RAZORPAY_KEY_SECRET: "s" })),
    ).toBe(false);
  });
});
