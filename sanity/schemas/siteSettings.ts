import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * Singleton. Mirrors SITE and SOCIALS in lib/content.ts.
 *
 * NAV_LINKS, FOOTER_COLUMNS and LEGAL_LINKS deliberately stay in code: their
 * hrefs point at element ids the components render, and a typo in a CMS field
 * would silently break the scroll-spy or a footer link with nothing to catch it.
 */
export default defineType({
  name: "siteSettings",
  title: "Site settings",
  type: "document",
  fields: [
    defineField({ name: "name", title: "Site name", type: "string", validation: (r) => r.required() }),
    defineField({ name: "email", title: "Contact email", type: "string", validation: (r) => r.required().email() }),
    defineField({ name: "phone", title: "Phone (display)", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "phoneHref",
      title: "Phone (tel: link)",
      type: "string",
      description: 'The href for the phone link, e.g. "tel:+919946560607".',
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "location", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "version",
      title: "Version tag",
      type: "string",
      description: 'The small footer build tag, e.g. "v3 · api.myndstack.io".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "socials",
      title: "Social profiles",
      type: "array",
      description: "Leave a URL blank to hide that icon rather than link nowhere.",
      of: [
        defineArrayMember({
          type: "object",
          name: "social",
          fields: [
            defineField({
              name: "label",
              type: "string",
              description: "X · LinkedIn · GitHub · Instagram — also picks the icon.",
              validation: (rule) => rule.required(),
            }),
            defineField({ name: "href", title: "URL", type: "url" }),
          ],
          preview: { select: { title: "label", subtitle: "href" } },
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: "Site settings" }) },
});
