import { defineArrayMember, defineField, defineType } from "sanity";
import { ANIMATABLE_METRIC_MESSAGE, NUMERIC } from "./shared";

/**
 * Singleton for the homepage's ordered content lists and long-form copy.
 *
 * What is here vs. in code: the hero *headline words* stay in Hero.tsx — the
 * word-cycle animation and its hard line break are written against that exact
 * array, so it is structure, not copy. Its eyebrow, subhead and CTA labels are
 * copy and live here. STACK_LAYERS stays in code for the same reason (the pinned
 * animation's geometry assumes four of them).
 */
export default defineType({
  name: "homepage",
  title: "Homepage",
  type: "document",
  groups: [
    { name: "hero", title: "Hero" },
    { name: "capabilities", title: "Capabilities" },
    { name: "process", title: "Process" },
    { name: "stats", title: "Stats" },
    { name: "contrast", title: "Contrast" },
    { name: "manifesto", title: "Manifesto" },
    { name: "clients", title: "Clients" },
  ],
  fields: [
    // --- Hero (copy only) ---
    defineField({
      name: "heroEyebrow",
      title: "Eyebrow",
      type: "string",
      group: "hero",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "heroSubhead",
      title: "Subhead",
      type: "text",
      rows: 2,
      group: "hero",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "heroCtaPrimary",
      title: "Primary CTA label",
      type: "string",
      group: "hero",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "heroCtaSecondary",
      title: "Secondary CTA label",
      type: "string",
      group: "hero",
      validation: (rule) => rule.required(),
    }),

    // --- Capabilities ---
    defineField({
      name: "capabilities",
      title: "Capabilities",
      type: "array",
      group: "capabilities",
      validation: (rule) => rule.required().min(1),
      of: [
        defineArrayMember({
          type: "object",
          name: "capability",
          fields: [
            defineField({ name: "n", title: "Number", type: "string", validation: (r) => r.required() }),
            defineField({ name: "title", type: "string", validation: (r) => r.required() }),
            defineField({
              name: "points",
              type: "array",
              of: [{ type: "string" }],
              validation: (rule) => rule.required().min(1),
            }),
            defineField({
              name: "metric",
              type: "string",
              description: "Counts up on the card.",
              validation: (rule) => rule.required().regex(NUMERIC, { name: ANIMATABLE_METRIC_MESSAGE }),
            }),
            defineField({ name: "metricLabel", type: "string", validation: (r) => r.required() }),
          ],
          preview: { select: { title: "title", subtitle: "metric" } },
        }),
      ],
    }),

    // --- Process ---
    defineField({
      name: "processSteps",
      title: "Process steps",
      type: "array",
      group: "process",
      validation: (rule) => rule.required().min(1),
      of: [
        defineArrayMember({
          type: "object",
          name: "processStep",
          fields: [
            defineField({ name: "n", title: "Number", type: "string", validation: (r) => r.required() }),
            defineField({ name: "t", title: "Title", type: "string", validation: (r) => r.required() }),
            defineField({ name: "d", title: "Description", type: "text", rows: 2, validation: (r) => r.required() }),
          ],
          preview: { select: { title: "t", subtitle: "n" } },
        }),
      ],
    }),

    // --- Stats ---
    defineField({
      name: "stats",
      title: "Stats",
      type: "array",
      group: "stats",
      validation: (rule) => rule.required().min(1),
      of: [
        defineArrayMember({
          type: "object",
          name: "stat",
          fields: [
            defineField({
              name: "v",
              title: "Value",
              type: "string",
              description: "Counts up. Must contain a number.",
              validation: (rule) => rule.required().regex(NUMERIC, { name: ANIMATABLE_METRIC_MESSAGE }),
            }),
            defineField({ name: "l", title: "Label", type: "string", validation: (r) => r.required() }),
          ],
          preview: { select: { title: "v", subtitle: "l" } },
        }),
      ],
    }),

    // --- Contrast ---
    defineField({
      name: "contrastWithout",
      title: "Without Myndstack",
      type: "array",
      of: [{ type: "string" }],
      group: "contrast",
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "contrastWith",
      title: "With Myndstack",
      type: "array",
      of: [{ type: "string" }],
      group: "contrast",
      validation: (rule) => rule.required().min(1),
    }),

    // --- Manifesto ---
    defineField({
      name: "manifestoLead",
      title: "Manifesto — lead",
      type: "text",
      rows: 4,
      group: "manifesto",
      description: "Brightens word by word. The trailing space before the kept phrase matters.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "manifestoKeep",
      title: "Manifesto — kept phrase",
      type: "string",
      group: "manifesto",
      description: "The final phrase, shown already bright.",
      validation: (rule) => rule.required(),
    }),

    // --- Clients ---
    defineField({
      name: "logoMarqueeHeading",
      title: "Logo marquee heading",
      type: "string",
      group: "clients",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "clientLockups",
      title: "Client lockups",
      type: "array",
      group: "clients",
      description: "Styled text, not images.",
      validation: (rule) => rule.required().min(1),
      of: [
        defineArrayMember({
          type: "object",
          name: "clientLockup",
          fields: [
            defineField({ name: "name", type: "string", validation: (r) => r.required() }),
            defineField({
              name: "className",
              title: "Type styling (Tailwind classes)",
              type: "string",
              description: 'e.g. "font-bold tracking-[0.06em]".',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "dotted",
              title: "Lime dot treatment",
              type: "boolean",
              description: 'Renders the "helios.ai" style lime full stop.',
            }),
          ],
          preview: { select: { title: "name" } },
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: "Homepage" }) },
});
