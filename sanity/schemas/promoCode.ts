import { defineField, defineType } from "sanity";

/** Mirrors the `PromoCode` type in lib/promo.ts. */
export default defineType({
  name: "promoCode",
  title: "Promo code",
  type: "document",
  description:
    "Discounts applied at checkout. The discount is worked out by this site, not by Razorpay — Razorpay has no customer-typed coupon, it simply charges the number we send. The discount comes off BEFORE tax.",
  fields: [
    defineField({
      name: "code",
      title: "Code",
      type: "string",
      description:
        'What the buyer types. Matched ignoring case and spaces, so "acme-sprint" and "ACME-SPRINT" are the same code. Prefer one code per prospect (e.g. "ACME-SPRINT-4F2A") — that way a leaked code costs you one sale, not all of them.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "label",
      title: "Internal label",
      type: "string",
      description:
        "For you, never shown to a buyer. e.g. \"Acme Corp — Q3 intro call\".",
    }),
    defineField({
      name: "active",
      title: "Active",
      type: "boolean",
      initialValue: true,
      description: "Switch off to stop the code working immediately.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "kind",
      title: "Discount type",
      type: "string",
      options: {
        list: [
          { title: "Percentage off", value: "percent" },
          { title: "Fixed amount off", value: "fixed" },
        ],
        layout: "radio",
      },
      initialValue: "percent",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "percent",
      title: "Percent off",
      type: "number",
      description: "1–100. Used when the discount type is Percentage.",
      hidden: ({ parent }) => parent?.kind !== "percent",
      validation: (rule) => rule.min(1).max(100),
    }),
    defineField({
      name: "fixedAmounts",
      title: "Fixed amounts",
      type: "array",
      description:
        "One entry per currency you want the code to work in. A fixed discount cannot be converted — ₹5,000 off is not £5,000 off — so a currency with no entry here simply rejects the code rather than guessing.",
      hidden: ({ parent }) => parent?.kind !== "fixed",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "region",
              title: "Region",
              type: "string",
              description: 'One of "IN", "US", "EU", "UK".',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "currency",
              title: "Currency",
              type: "string",
              description: 'One of "INR", "USD", "EUR", "GBP".',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "amountMinor",
              title: "Amount off (minor units)",
              type: "number",
              description:
                "Smallest unit — paise for INR, cents for USD/EUR, pence for GBP. ₹5,000 off is 500000.",
              validation: (rule) => rule.required().integer().positive(),
            }),
          ],
          preview: { select: { title: "currency", subtitle: "amountMinor" } },
        },
      ],
    }),
    defineField({
      name: "startsAt",
      title: "Starts at",
      type: "datetime",
      description: "Optional. Before this the code reports as not yet active.",
    }),
    defineField({
      name: "expiresAt",
      title: "Expires at",
      type: "datetime",
      description:
        "Optional, and the main safety net on a code that gets shared further than you intended. Note a date that cannot be read is treated as expired, not as no-expiry.",
    }),
    defineField({
      name: "tierSlugs",
      title: "Limit to plans",
      type: "array",
      of: [{ type: "string" }],
      description:
        'Checkout slugs, e.g. "discovery-sprint". Leave empty to allow every purchasable plan.',
    }),
    defineField({
      name: "maxRedemptions",
      title: "Max total uses (not yet enforced)",
      type: "number",
      description:
        "RECORDED BUT NOT ENFORCED. Counting uses safely needs a store that can increment atomically, which this site does not have yet — two checkouts a second apart would both see the same count and both succeed. Until then, use one code per prospect plus an expiry. Set it if you know the intent; it is here so enforcement can be switched on later without re-entering anything.",
      validation: (rule) => rule.integer().positive(),
    }),
    defineField({
      name: "maxPerCustomer",
      title: "Max uses per customer (not yet enforced)",
      type: "number",
      description:
        "RECORDED BUT NOT ENFORCED, and needs more than a counter: we do not know who the buyer is at this point in the flow — Razorpay collects their email inside its own window, after the order exists. Enforcing this would mean asking for an email on our side first.",
      validation: (rule) => rule.integer().positive(),
    }),
  ],
  preview: {
    select: { title: "code", subtitle: "label", active: "active" },
    prepare: ({ title, subtitle, active }) => ({
      title: active ? title : `${title} (off)`,
      subtitle,
    }),
  },
});
