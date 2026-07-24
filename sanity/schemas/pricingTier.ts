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
  ],
  orderings: [
    { title: "Display order", name: "order", by: [{ field: "order", direction: "asc" }] },
  ],
  preview: { select: { title: "name", subtitle: "price" } },
});
