import { defineField, defineType } from "sanity";
import { orderField } from "./shared";

/** Mirrors an entry in TESTIMONIALS (lib/content.ts). */
export default defineType({
  name: "testimonial",
  title: "Testimonial",
  type: "document",
  fields: [
    defineField({
      name: "quote",
      title: "Quote",
      type: "text",
      rows: 3,
      description: "Include the surrounding quotation marks, as in the original.",
      validation: (rule) => rule.required(),
    }),
    orderField,
    defineField({
      name: "index",
      title: "Index label",
      type: "string",
      description: 'The "01" / "02" marker shown beside the quote.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "role",
      title: "Attribution — role",
      type: "string",
      description: "Anonymised to a role, not a name.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "org",
      title: "Attribution — organisation type",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "metric",
      title: "Metric — value",
      type: "string",
      description:
        'Optional. The headline number under the quote, e.g. "-40%" or "6×".',
    }),
    defineField({
      name: "metricLabel",
      title: "Metric — label",
      type: "string",
      description:
        'Optional. The short label after the value, e.g. "infra spend" or "faster time to endpoint". Only shown when metric is set.',
    }),
  ],
  orderings: [
    { title: "Display order", name: "order", by: [{ field: "order", direction: "asc" }] },
  ],
  preview: { select: { title: "role", subtitle: "org" } },
});
