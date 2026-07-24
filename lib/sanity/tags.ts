/**
 * Cache-tag names, shared by the query layer (which stamps them on each fetch)
 * and the revalidate webhook (which drops them on publish). One per content
 * type, plus the two singletons. Keeping them here means the webhook and the
 * fetches can never disagree about a tag string.
 *
 * The webhook maps a document's `_type` straight onto one of these, so the KEYS
 * of this object must match the schema `_type` names exactly.
 */
export const TAGS = {
  role: "role",
  caseStudy: "caseStudy",
  testimonial: "testimonial",
  teamMember: "teamMember",
  faq: "faq",
  pricingTier: "pricingTier",
  homepage: "homepage",
  siteSettings: "siteSettings",
} as const;

export type ContentTag = (typeof TAGS)[keyof typeof TAGS];
