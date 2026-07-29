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
  ],
  orderings: [
    { title: "Display order", name: "order", by: [{ field: "order", direction: "asc" }] },
  ],
  preview: { select: { title: "name", subtitle: "price" } },
});
