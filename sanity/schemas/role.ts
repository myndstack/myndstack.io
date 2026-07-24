import { defineField, defineType } from "sanity";
import { orderField } from "./shared";

/** Mirrors the `Role` type in lib/roles.ts, field for field. */
export default defineType({
  name: "role",
  title: "Career role",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      description: "The URL segment: /careers/<slug>.",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    orderField,
    defineField({
      name: "meta",
      title: "Meta line",
      type: "string",
      description: 'Short line on the homepage row and listing card, e.g. "Remote · Infra".',
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "team", type: "string", validation: (r) => r.required() }),
    defineField({ name: "location", type: "string", validation: (r) => r.required() }),
    defineField({ name: "type", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "salary",
      title: "Package",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "lede",
      title: "Lede",
      type: "text",
      rows: 2,
      description: "One-line summary used as the page lede and card subtitle.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "about",
      title: "About the role",
      type: "array",
      of: [{ type: "text", rows: 3 }],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "responsibilities",
      title: "What you'll do",
      type: "array",
      of: [{ type: "string" }],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "requirements",
      title: "What we're looking for",
      type: "array",
      of: [{ type: "string" }],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "bonus",
      title: "Nice to have",
      type: "array",
      of: [{ type: "string" }],
      validation: (rule) => rule.required().min(1),
    }),
  ],
  orderings: [
    { title: "Display order", name: "order", by: [{ field: "order", direction: "asc" }] },
  ],
  preview: {
    select: { title: "title", subtitle: "meta" },
  },
});
