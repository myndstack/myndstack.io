import { defineField } from "sanity";

/**
 * Every collection here is an ordered list on the live site, and Sanity
 * documents have no inherent order. Rather than pull in the orderable-document
 * plugin, each document carries an explicit `order` number and the queries sort
 * by it — predictable, testable, and visible to an editor.
 */
export const orderField = defineField({
  name: "order",
  title: "Order",
  type: "number",
  description: "Lower numbers appear first.",
  validation: (rule) => rule.required(),
});

/**
 * The metric parser in lib/format.ts animates a number out of strings like
 * "99.99%", "12ms", "120+" and "3 regions". A value it can't find a number in
 * (e.g. "Custom") is shown but never animates — fine for a price, wrong for a
 * stat. Fields that MUST count up validate against this, the parser's own
 * regex, so an editor is warned in Studio rather than shipping a dead stat.
 */
export const NUMERIC = /^([^\d-]*)(-?[\d,]*\.?\d+)(.*)$/;

/** Message shown when an animatable-metric field fails NUMERIC. */
export const ANIMATABLE_METRIC_MESSAGE =
  "Must contain a number so it can count up — e.g. 99.99%, 12ms, 120+, 3 regions.";

/**
 * A length warning (never an error: existing copy still publishes) for copy
 * the redesigned landing sets in a fixed cell — past the limit it wraps into
 * the engine or out of its cell.
 */
export const fits = (what: string, max: number) =>
  `${what} over ${max} characters don't fit their place on the redesigned landing — shorter reads better there.`;
