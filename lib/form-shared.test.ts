import { describe, expect, it } from "vitest";
import { HONEYPOT_FIELD, toFieldErrors } from "./form-shared";
import { contactSchema } from "./schemas";

const valid = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  company: "Analytical",
  budget: "$10k – $50k",
  source: "Referral",
  message: "We need a unified inference layer across three regions.",
};

describe("toFieldErrors", () => {
  it("maps one message per field", () => {
    const result = contactSchema.safeParse({ name: "A", email: "nope", message: "hi" });
    expect(result.success).toBe(false);

    const errors = toFieldErrors(result.error!);
    expect(Object.keys(errors).sort()).toEqual(["email", "message", "name"]);
    expect(errors.email).toMatch(/valid email/i);
  });

  it("keeps only the first message for a field", () => {
    const errors = toFieldErrors({
      issues: [
        { path: ["name"], message: "first" },
        { path: ["name"], message: "second" },
      ],
    });
    expect(errors.name).toBe("first");
  });

  it("buckets path-less issues under `form`", () => {
    expect(toFieldErrors({ issues: [{ path: [], message: "bad" }] })).toEqual({
      form: "bad",
    });
  });
});

describe("contactSchema", () => {
  it("accepts a well-formed submission", () => {
    expect(contactSchema.safeParse(valid).success).toBe(true);
  });

  it("treats the optional fields as optional", () => {
    expect(
      contactSchema.safeParse({
        name: valid.name,
        email: valid.email,
        message: valid.message,
      }).success,
    ).toBe(true);
  });

  it("rejects a message that is too short to act on", () => {
    expect(contactSchema.safeParse({ ...valid, message: "hi" }).success).toBe(false);
  });

  it("trims surrounding whitespace", () => {
    const parsed = contactSchema.parse({ ...valid, name: "  Ada  " });
    expect(parsed.name).toBe("Ada");
  });

  it("accepts an empty honeypot", () => {
    expect(HONEYPOT_FIELD).toBeTruthy();
    expect(contactSchema.safeParse({ ...valid, [HONEYPOT_FIELD]: "" }).success).toBe(
      true,
    );
  });

  it("rejects a filled honeypot", () => {
    // The route short-circuits these before validation, but the schema is the
    // backstop if that order ever changes.
    expect(
      contactSchema.safeParse({ ...valid, [HONEYPOT_FIELD]: "http://spam" }).success,
    ).toBe(false);
  });
});
