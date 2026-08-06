import "server-only";

import { cache } from "react";
import { z } from "zod";

import type { CaseStudy } from "@/lib/cases";
import type { PricingTier, RegionalPrice, Social, TierCheckout } from "@/lib/content";
import { normalizeCode, type PromoCode } from "@/lib/promo";
import type { Role } from "@/lib/roles";
import { sanityFetch } from "./client";
import { TAGS } from "./tags";

/**
 * The read boundary.
 *
 * Two jobs, both deliberate:
 *
 * 1. **Return the shapes the components already expect.** The query functions
 *    are typed to `Role`, `CaseStudy`, `PricingTier` etc. from lib/, so moving
 *    a component from an imported const to a fetched prop is a near-mechanical
 *    change, and the rest of the app never learns where the data came from.
 * 2. **Validate every response with zod.** A missing or mistyped CMS field
 *    becomes a loud, located error at the fetch — the same discipline the forms
 *    already use — instead of a silently blank section discovered in production.
 *    This is server-only, so it costs the first-load bundle nothing (the reason
 *    zod is kept out of lib/form-shared.ts does not apply here).
 */

// --- Shared homepage element types (the ones content.ts only had as consts) ---

export type Capability = {
  n: string;
  title: string;
  points: string[];
  metric: string;
  metricLabel: string;
};

export type ProcessStep = { n: string; t: string; d: string };
export type Stat = { v: string; l: string };
export type TeamMember = { i: string; n: string; r: string };
export type Faq = { q: string; a: string };
export type ClientLockup = { name: string; className: string; dotted?: boolean };
export type Testimonial = {
  quote: string;
  index: string;
  role: string;
  org: string;
  /** Optional headline number rendered beneath the quote. */
  metric?: string;
  /** Only shown alongside `metric`. */
  metricLabel?: string;
};

export type HeroCopy = {
  eyebrow: string;
  subhead: string;
  ctaPrimary: string;
  ctaSecondary: string;
};

export type Homepage = {
  hero: HeroCopy;
  capabilities: Capability[];
  steps: ProcessStep[];
  stats: Stat[];
  contrastWithout: string[];
  contrastWith: string[];
  manifestoLead: string;
  manifestoKeep: string;
  logoMarqueeHeading: string;
  clientLockups: ClientLockup[];
};

export type SiteSettings = {
  name: string;
  email: string;
  phone: string;
  phoneHref: string;
  location: string;
  version: string;
  socials: Social[];
};

// --- zod schemas (kept structurally identical to the types above) ------------

const nonEmpty = z.string().min(1);
const stringList = z.array(z.string().min(1)).min(1);

/**
 * An optional field, the way GROQ actually delivers one: a projected field that
 * has no value comes back as `null`, not `undefined`. Plain `.optional()` rejects
 * that null. This accepts either and normalises to `undefined`, matching the
 * `field?: T` shape of the TS types — without it, every case metric that isn't
 * the accented one fails validation. (Applies to booleans and strings; `href`
 * on a social keeps `.nullable()` because its type genuinely is `string | null`.)
 */
const optionalBool = z
  .boolean()
  .nullish()
  .transform((v) => v ?? undefined);
const optionalString = z
  .string()
  .nullish()
  .transform((v) => v ?? undefined);

const roleSchema = z.object({
  slug: nonEmpty,
  title: nonEmpty,
  meta: nonEmpty,
  team: nonEmpty,
  location: nonEmpty,
  type: nonEmpty,
  salary: nonEmpty,
  lede: nonEmpty,
  about: stringList,
  responsibilities: stringList,
  requirements: stringList,
  bonus: stringList,
}) satisfies z.ZodType<Role>;

const caseMetricSchema = z.object({
  v: nonEmpty,
  l: nonEmpty,
  lime: optionalBool,
});

const caseSchema = z.object({
  slug: nonEmpty,
  client: nonEmpty,
  industry: nonEmpty,
  tags: stringList,
  lede: nonEmpty,
  summary: nonEmpty,
  challenge: stringList,
  approach: stringList,
  outcome: stringList,
  stack: stringList,
  metrics: z.array(caseMetricSchema).min(1),
  duration: nonEmpty,
  regions: nonEmpty,
  featured: optionalBool,
}) satisfies z.ZodType<CaseStudy>;

const testimonialSchema = z.object({
  quote: nonEmpty,
  index: nonEmpty,
  role: nonEmpty,
  org: nonEmpty,
  metric: optionalString,
  metricLabel: optionalString,
}) satisfies z.ZodType<Testimonial>;

const teamSchema = z.object({
  i: nonEmpty,
  n: nonEmpty,
  r: nonEmpty,
}) satisfies z.ZodType<TeamMember>;

const faqSchema = z.object({
  q: nonEmpty,
  a: nonEmpty,
}) satisfies z.ZodType<Faq>;

/** Mirrors `PromoCode` in lib/promo.ts. Amounts are positive safe integers, so
 *  a malformed CMS value fails parsing rather than becoming a wrong discount. */
const promoCodeSchema = z.object({
  code: nonEmpty,
  label: optionalString,
  kind: z.enum(["percent", "fixed"]),
  percent: z.number().min(1).max(100).nullish().transform((v) => v ?? undefined),
  fixedAmounts: z
    .array(
      z.object({
        region: z.enum(["IN", "US", "EU", "UK"]),
        currency: z.enum(["INR", "USD", "EUR", "GBP"]),
        amountMinor: z.number().int().positive(),
      }),
    )
    .nullish()
    .transform((v) => v ?? undefined),
  active: z.boolean(),
  startsAt: optionalString,
  expiresAt: optionalString,
  tierSlugs: z
    .array(nonEmpty)
    .nullish()
    .transform((v) => v ?? undefined),
  maxRedemptions: z.number().int().positive().nullish().transform((v) => v ?? undefined),
  maxPerCustomer: z.number().int().positive().nullish().transform((v) => v ?? undefined),
}) satisfies z.ZodType<PromoCode>;

const regionalPriceSchema = z.object({
  region: z.enum(["IN", "US", "EU", "UK"]),
  currency: z.enum(["INR", "USD", "EUR", "GBP"]),
  symbol: z.enum(["₹", "$", "€", "£"]),
  price: nonEmpty,
  annualPrice: optionalString,
  period: optionalString,
  annualNote: optionalString,
  taxNote: optionalString,
  paymentNote: optionalString,
}) satisfies z.ZodType<RegionalPrice>;

const checkoutSchema = z.object({
  slug: nonEmpty,
  currency: z.literal("INR"),
  // Positive safe integers only — a malformed amount must fail parsing here
  // rather than reach the order route as a bad charge.
  amountMinor: z.number().int().positive(),
  annualAmountMinor: z.number().int().positive(),
  // Editorial checkout context — optional, edited in Studio. `nullish → undefined`
  // matches the regionalPrices pattern so an empty CMS field is simply absent.
  howItWorks: z
    .array(z.object({ title: nonEmpty, body: nonEmpty }))
    .nullish()
    .transform((v) => v ?? undefined),
  assurance: z
    .array(z.object({ title: nonEmpty, body: nonEmpty }))
    .nullish()
    .transform((v) => v ?? undefined),
  faqs: z
    .array(z.object({ q: nonEmpty, a: nonEmpty }))
    .nullish()
    .transform((v) => v ?? undefined),
  // Per-region charge amounts (International Payments). Positive safe ints only,
  // so a malformed CMS value fails parsing here rather than becoming a charge.
  regionalCharges: z
    .array(
      z.object({
        region: z.enum(["IN", "US", "EU", "UK"]),
        currency: z.enum(["INR", "USD", "EUR", "GBP"]),
        amountMinor: z.number().int().positive(),
        annualAmountMinor: z.number().int().positive(),
      }),
    )
    .nullish()
    .transform((v) => v ?? undefined),
}) satisfies z.ZodType<TierCheckout>;

const pricingSchema = z.object({
  name: nonEmpty,
  blurb: nonEmpty,
  price: nonEmpty,
  annualPrice: optionalString,
  period: optionalString,
  annualNote: optionalString,
  badge: optionalString,
  cta: nonEmpty,
  highlighted: z.boolean(),
  features: stringList,
  regionalPrices: z
    .array(regionalPriceSchema)
    .nullish()
    .transform((v) => v ?? undefined),
  checkout: checkoutSchema.nullish().transform((v) => v ?? undefined),
}) satisfies z.ZodType<PricingTier>;

const capabilitySchema = z.object({
  n: nonEmpty,
  title: nonEmpty,
  points: stringList,
  metric: nonEmpty,
  metricLabel: nonEmpty,
}) satisfies z.ZodType<Capability>;

const homepageSchema = z.object({
  hero: z.object({
    eyebrow: nonEmpty,
    subhead: nonEmpty,
    ctaPrimary: nonEmpty,
    ctaSecondary: nonEmpty,
  }),
  capabilities: z.array(capabilitySchema).min(1),
  steps: z.array(z.object({ n: nonEmpty, t: nonEmpty, d: nonEmpty })).min(1),
  stats: z.array(z.object({ v: nonEmpty, l: nonEmpty })).min(1),
  contrastWithout: stringList,
  contrastWith: stringList,
  manifestoLead: nonEmpty,
  manifestoKeep: nonEmpty,
  logoMarqueeHeading: nonEmpty,
  clientLockups: z
    .array(
      z.object({ name: nonEmpty, className: nonEmpty, dotted: optionalBool }),
    )
    .min(1),
}) satisfies z.ZodType<Homepage>;

const siteSettingsSchema = z.object({
  name: nonEmpty,
  email: nonEmpty,
  phone: nonEmpty,
  phoneHref: nonEmpty,
  location: nonEmpty,
  version: nonEmpty,
  socials: z.array(
    z.object({ label: nonEmpty, href: z.string().nullable() }),
  ),
}) satisfies z.ZodType<SiteSettings>;

// --- parse helper ------------------------------------------------------------

function parse<T>(schema: z.ZodType<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(
      `Sanity content failed validation for "${label}". A field is missing or ` +
        `the wrong type in the CMS. Details: ${result.error.message}`,
    );
  }
  return result.data;
}

// --- GROQ projections (field names mapped to the TS shapes) ------------------

const ROLE_FIELDS = `
  "slug": slug.current, title, meta, team, location, type, salary, lede,
  about, responsibilities, requirements, bonus
`;

const CASE_FIELDS = `
  "slug": slug.current, client, industry, tags, lede, summary,
  challenge, approach, outcome, stack,
  metrics[]{ v, l, lime }, duration, regions, featured
`;

// --- queries -----------------------------------------------------------------
//
// Each is wrapped in React `cache()` so that when several server components in
// one render call the same query — Capabilities, Process, StatsStrip, Contrast
// and LogoMarquee all read the homepage document — it fetches once per request.
// That lets a section stay self-contained (fetch its own slice) without paying
// for N round trips, so only the client components need data threaded as props.

export const getRoles = cache(async (): Promise<Role[]> => {
  const data = await sanityFetch<unknown[]>(
    `*[_type == "role"] | order(order asc){${ROLE_FIELDS}}`,
    {},
    [TAGS.role],
  );
  return z.array(roleSchema).parse(data);
});

export const getRole = cache(async (slug: string): Promise<Role | null> => {
  const data = await sanityFetch<unknown>(
    `*[_type == "role" && slug.current == $slug][0]{${ROLE_FIELDS}}`,
    { slug },
    [TAGS.role],
  );
  return data ? parse(roleSchema, data, `role "${slug}"`) : null;
});

export const getRoleSlugs = cache(async (): Promise<string[]> => {
  return sanityFetch<string[]>(
    `*[_type == "role" && defined(slug.current)].slug.current`,
    {},
    [TAGS.role],
  );
});

export const getCases = cache(async (): Promise<CaseStudy[]> => {
  const data = await sanityFetch<unknown[]>(
    `*[_type == "caseStudy"] | order(order asc){${CASE_FIELDS}}`,
    {},
    [TAGS.caseStudy],
  );
  return z.array(caseSchema).parse(data);
});

export const getCase = cache(async (slug: string): Promise<CaseStudy | null> => {
  const data = await sanityFetch<unknown>(
    `*[_type == "caseStudy" && slug.current == $slug][0]{${CASE_FIELDS}}`,
    { slug },
    [TAGS.caseStudy],
  );
  return data ? parse(caseSchema, data, `case "${slug}"`) : null;
});

export const getCaseSlugs = cache(async (): Promise<string[]> => {
  return sanityFetch<string[]>(
    `*[_type == "caseStudy" && defined(slug.current)].slug.current`,
    {},
    [TAGS.caseStudy],
  );
});

export const getTestimonials = cache(async (): Promise<Testimonial[]> => {
  const data = await sanityFetch<unknown[]>(
    `*[_type == "testimonial"] | order(order asc){ quote, index, role, org, metric, metricLabel }`,
    {},
    [TAGS.testimonial],
  );
  return z.array(testimonialSchema).parse(data);
});

export const getTeam = cache(async (): Promise<TeamMember[]> => {
  const data = await sanityFetch<unknown[]>(
    `*[_type == "teamMember"] | order(order asc){ i, n, r }`,
    {},
    [TAGS.teamMember],
  );
  return z.array(teamSchema).parse(data);
});

export const getFaqs = cache(async (): Promise<Faq[]> => {
  const data = await sanityFetch<unknown[]>(
    `*[_type == "faq"] | order(order asc){ q, a }`,
    {},
    [TAGS.faq],
  );
  return z.array(faqSchema).parse(data);
});

export const getPricingTiers = cache(async (): Promise<PricingTier[]> => {
  const data = await sanityFetch<unknown[]>(
    `*[_type == "pricingTier"] | order(order asc){
      name, blurb, price, annualPrice, period, annualNote, badge, cta,
      highlighted, features,
      regionalPrices[]{
        region, currency, symbol, price, annualPrice, period, annualNote,
        taxNote, paymentNote
      },
      checkout{
        slug, currency, amountMinor, annualAmountMinor,
        howItWorks[]{ title, body }, assurance[]{ title, body }, faqs[]{ q, a },
        regionalCharges[]{ region, currency, amountMinor, annualAmountMinor }
      }
    }`,
    {},
    [TAGS.pricingTier],
  );
  return z.array(pricingSchema).parse(data);
});

export const getHomepage = cache(async (): Promise<Homepage> => {
  const data = await sanityFetch<unknown>(
    `*[_type == "homepage"][0]{
      "hero": {
        "eyebrow": heroEyebrow,
        "subhead": heroSubhead,
        "ctaPrimary": heroCtaPrimary,
        "ctaSecondary": heroCtaSecondary
      },
      capabilities[]{ n, title, points, metric, metricLabel },
      "steps": processSteps[]{ n, t, d },
      stats[]{ v, l },
      contrastWithout, contrastWith,
      manifestoLead, manifestoKeep,
      logoMarqueeHeading,
      clientLockups[]{ name, className, dotted }
    }`,
    {},
    [TAGS.homepage],
  );
  return parse(homepageSchema, data, "homepage");
});

/**
 * One promo code by its typed value, or null.
 *
 * Fetched by code rather than fetching all and filtering, so an unknown code
 * costs one indexed lookup and the full list of live codes never travels to
 * anything the buyer can see.
 *
 * Unlike every other query here this does NOT throw on a schema mismatch. A
 * malformed promo document must degrade to "that code isn't valid" — a buyer
 * who mistypes a code, or an owner who half-filled one in Studio, should never
 * be shown an error page on the checkout screen. Everything else about it is
 * validated exactly as strictly.
 */
export const getPromoCode = cache(
  async (code: string): Promise<PromoCode | null> => {
    const normalized = normalizeCode(code);
    if (!normalized || normalized.length > 64) return null;

    const data = await sanityFetch<unknown>(
      `*[_type == "promoCode" && upper(code) == $code][0]{
        code, label, kind, percent, active, startsAt, expiresAt, tierSlugs,
        maxRedemptions, maxPerCustomer,
        fixedAmounts[]{ region, currency, amountMinor }
      }`,
      { code: normalized },
      [TAGS.promoCode],
    );
    if (!data) return null;

    const result = promoCodeSchema.safeParse(data);
    return result.success ? result.data : null;
  },
);

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const data = await sanityFetch<unknown>(
    `*[_type == "siteSettings"][0]{
      name, email, phone, phoneHref, location, version,
      socials[]{ label, href }
    }`,
    {},
    [TAGS.siteSettings],
  );
  return parse(siteSettingsSchema, data, "siteSettings");
});
