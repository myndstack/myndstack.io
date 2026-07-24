import { defineField, defineType } from "sanity";
import { orderField } from "./shared";

/** Mirrors an entry in TEAM (lib/content.ts). */
export default defineType({
  name: "teamMember",
  title: "Team member",
  type: "document",
  fields: [
    defineField({
      name: "n",
      title: "Name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    orderField,
    defineField({
      name: "i",
      title: "Initials",
      type: "string",
      description: "Two-letter monogram shown in the avatar tile, e.g. AV.",
      validation: (rule) => rule.required().max(3),
    }),
    defineField({
      name: "r",
      title: "Role",
      type: "string",
      validation: (rule) => rule.required(),
    }),
  ],
  orderings: [
    { title: "Display order", name: "order", by: [{ field: "order", direction: "asc" }] },
  ],
  preview: { select: { title: "n", subtitle: "r" } },
});
