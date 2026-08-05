import { defineField, defineType } from "sanity";
import { orderField } from "./shared";

/** Mirrors the `PricingTier` type in lib/content.ts. */
export default defineType({
  name: "pricingTier",
  title: "Pricing tier",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    orderField,
    defineField({
      name: "blurb",
      title: "Blurb",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "price",
      title: "Price",
      type: "string",
      description: 'Shown as-is. Free text — "$0", "$2,400", "Custom" all valid.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "annualPrice",
      title: "Annual price",
      type: "string",
      description: "Optional. Shown instead of Price when annual billing is selected.",
    }),
    defineField({ name: "period", title: "Period", type: "string" }),
    defineField({ name: "annualNote", title: "Annual note", type: "string" }),
    defineField({ name: "badge", title: "Badge", type: "string" }),
    defineField({
      name: "cta",
      title: "CTA label",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "highlighted",
      title: "Highlighted",
      type: "boolean",
      description: "The emphasised middle tier.",
    }),
    defineField({
      name: "features",
      title: "Features",
      type: "array",
      of: [{ type: "string" }],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "regionalPrices",
      title: "Regional prices",
      description:
        "Optional. Per-region price + tax + payment overlay. Any field left blank falls back to the tier's top-level value.",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "region",
              title: "Region",
              type: "string",
              options: {
                list: [
                  { title: "India (INR)", value: "IN" },
                  { title: "United States (USD)", value: "US" },
                  { title: "Eurozone (EUR)", value: "EU" },
                  { title: "United Kingdom (GBP)", value: "UK" },
                ],
                layout: "radio",
              },
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "currency",
              title: "Currency code",
              type: "string",
              options: {
                list: ["INR", "USD", "EUR", "GBP"],
              },
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "symbol",
              title: "Currency symbol",
              type: "string",
              description: 'One of "₹", "$", "€", "£".',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "price",
              title: "Price",
              type: "string",
              description: 'Full formatted price, e.g. "₹1,99,000" or "Fixed".',
              validation: (rule) => rule.required(),
            }),
            defineField({ name: "annualPrice", title: "Annual price", type: "string" }),
            defineField({ name: "period", title: "Period", type: "string" }),
            defineField({ name: "annualNote", title: "Annual note", type: "string" }),
            defineField({
              name: "taxNote",
              title: "Tax note",
              type: "string",
              description:
                'Displayed under the price. e.g. "excl. GST 18%" or "billed in USD".',
            }),
            defineField({
              name: "paymentNote",
              title: "Payment note",
              type: "string",
              description:
                'One-liner of local payment methods, e.g. "UPI · cards · netbanking".',
            }),
          ],
          preview: {
            select: { title: "region", subtitle: "price" },
          },
        },
      ],
    }),
    defineField({
      name: "checkout",
      title: "Self-serve checkout",
      description:
        "Present only on tiers that can be bought online (today: Scale). These amounts — not the display price — are the authoritative charge, in INR paise. Leave empty for free, quote, and custom tiers.",
      type: "object",
      fields: [
        defineField({
          name: "slug",
          title: "Slug",
          type: "string",
          description: "URL of the checkout page: /pricing/<slug>.",
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: "currency",
          title: "Currency",
          type: "string",
          options: { list: ["INR"] },
          initialValue: "INR",
          description: "Fixed to INR while Razorpay is the only processor.",
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: "amountMinor",
          title: "Monthly amount (paise)",
          type: "number",
          description: "e.g. ₹1,99,000 → 19900000.",
          validation: (rule) => rule.required().integer().positive(),
        }),
        defineField({
          name: "annualAmountMinor",
          title: "Annual amount (paise)",
          type: "number",
          description: "One-time 12-month charge, e.g. ₹19,80,000 → 198000000.",
          validation: (rule) => rule.required().integer().positive(),
        }),
        defineField({
          name: "howItWorks",
          title: "How it works (steps)",
          description: "Optional. Numbered steps shown on the checkout page.",
          type: "array",
          of: [
            {
              type: "object",
              fields: [
                defineField({ name: "title", title: "Title", type: "string", validation: (r) => r.required() }),
                defineField({ name: "body", title: "Body", type: "text", rows: 2, validation: (r) => r.required() }),
              ],
              preview: { select: { title: "title", subtitle: "body" } },
            },
          ],
        }),
        defineField({
          name: "assurance",
          title: "Assurance points",
          description: 'Optional. Short risk-reversal tiles, e.g. "Fixed price", "Fee credited".',
          type: "array",
          of: [
            {
              type: "object",
              fields: [
                defineField({ name: "title", title: "Title", type: "string", validation: (r) => r.required() }),
                defineField({ name: "body", title: "Body", type: "string", validation: (r) => r.required() }),
              ],
              preview: { select: { title: "title", subtitle: "body" } },
            },
          ],
        }),
        defineField({
          name: "faqs",
          title: "Checkout FAQ",
          description: "Optional. Common questions shown on the checkout page.",
          type: "array",
          of: [
            {
              type: "object",
              fields: [
                defineField({ name: "q", title: "Question", type: "string", validation: (r) => r.required() }),
                defineField({ name: "a", title: "Answer", type: "text", rows: 3, validation: (r) => r.required() }),
              ],
              preview: { select: { title: "q", subtitle: "a" } },
            },
          ],
        }),
        defineField({
          name: "regionalCharges",
          title: "Regional charge amounts (International Payments)",
          description:
            "Optional. A region listed here is CHARGED in its currency via Razorpay; regions absent charge the INR amount above. Amounts are in the currency's smallest unit — €549 → 54900 (cents). For one-time tiers set annual = amount.",
          type: "array",
          of: [
            {
              type: "object",
              fields: [
                defineField({
                  name: "region",
                  title: "Region",
                  type: "string",
                  options: {
                    list: [
                      { title: "India (INR)", value: "IN" },
                      { title: "United States (USD)", value: "US" },
                      { title: "Eurozone (EUR)", value: "EU" },
                      { title: "United Kingdom (GBP)", value: "UK" },
                    ],
                    layout: "radio",
                  },
                  validation: (r) => r.required(),
                }),
                defineField({
                  name: "currency",
                  title: "Currency",
                  type: "string",
                  options: { list: ["INR", "USD", "EUR", "GBP"] },
                  validation: (r) => r.required(),
                }),
                defineField({
                  name: "amountMinor",
                  title: "Amount (minor units)",
                  type: "number",
                  description: "e.g. €549 → 54900 (cents). Charged as-is.",
                  validation: (r) => r.required().integer().positive(),
                }),
                defineField({
                  name: "annualAmountMinor",
                  title: "Annual amount (minor units)",
                  type: "number",
                  description: "Same as Amount for one-time tiers.",
                  validation: (r) => r.required().integer().positive(),
                }),
              ],
              preview: { select: { title: "region", subtitle: "currency" } },
            },
          ],
        }),
      ],
    }),
  ],
  orderings: [
    { title: "Display order", name: "order", by: [{ field: "order", direction: "asc" }] },
  ],
  preview: { select: { title: "name", subtitle: "price" } },
});
