import { defineArrayMember, defineField, defineType } from "sanity";
import { ANIMATABLE_METRIC_MESSAGE, NUMERIC, orderField } from "./shared";

/** Mirrors `CaseStudy` / `CaseMetric` in lib/cases.ts. */
export default defineType({
  name: "caseStudy",
  title: "Case study",
  type: "document",
  fields: [
    defineField({
      name: "client",
      title: "Client",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      description: "The URL segment: /work/<slug>.",
      options: { source: "client", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    orderField,
    defineField({ name: "industry", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "tags",
      type: "array",
      of: [{ type: "string" }],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "lede",
      type: "text",
      rows: 2,
      description: "One line, used as the page lede.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "summary",
      type: "text",
      rows: 3,
      description: "Card body on the homepage and the /work index.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "challenge",
      type: "array",
      of: [{ type: "text", rows: 3 }],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "approach",
      type: "array",
      of: [{ type: "text", rows: 3 }],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "outcome",
      type: "array",
      of: [{ type: "text", rows: 3 }],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "stack",
      type: "array",
      of: [{ type: "string" }],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "metrics",
      title: "Metrics",
      type: "array",
      validation: (rule) => rule.required().min(1),
      of: [
        defineArrayMember({
          type: "object",
          name: "metric",
          fields: [
            defineField({
              name: "v",
              title: "Value",
              type: "string",
              description: "The number, exactly as it should read. Counts up on the page.",
              validation: (rule) =>
                rule.required().regex(NUMERIC, { name: ANIMATABLE_METRIC_MESSAGE }),
            }),
            defineField({
              name: "l",
              title: "Label",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "lime",
              title: "Accent (headline metric)",
              type: "boolean",
              description: "One per case — the number the card leads with.",
            }),
          ],
          preview: { select: { title: "v", subtitle: "l" } },
        }),
      ],
    }),
    defineField({ name: "duration", type: "string", validation: (r) => r.required() }),
    defineField({ name: "regions", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "featured",
      title: "Featured",
      type: "boolean",
      description:
        "Exactly one case is featured — it gets the wide card on the homepage. Setting a second is flagged.",
    }),
  ],
  orderings: [
    { title: "Display order", name: "order", by: [{ field: "order", direction: "asc" }] },
  ],
  preview: {
    select: { title: "client", subtitle: "industry", featured: "featured" },
    prepare: ({ title, subtitle, featured }) => ({
      title: featured ? `★ ${title}` : title,
      subtitle,
    }),
  },
});
