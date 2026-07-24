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
  ],
  orderings: [
    { title: "Display order", name: "order", by: [{ field: "order", direction: "asc" }] },
  ],
  preview: { select: { title: "role", subtitle: "org" } },
});
