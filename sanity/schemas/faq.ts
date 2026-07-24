import { defineField, defineType } from "sanity";
import { orderField } from "./shared";

/** Mirrors an entry in FAQS (lib/content.ts). */
export default defineType({
  name: "faq",
  title: "FAQ",
  type: "document",
  fields: [
    defineField({
      name: "q",
      title: "Question",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    orderField,
    defineField({
      name: "a",
      title: "Answer",
      type: "text",
      rows: 4,
      validation: (rule) => rule.required(),
    }),
  ],
  orderings: [
    { title: "Display order", name: "order", by: [{ field: "order", direction: "asc" }] },
  ],
  preview: { select: { title: "q" } },
});
