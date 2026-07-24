/**
 * One-time content import: the current TS constants → Sanity.
 *
 * Run once, after creating the project and a write token:
 *
 *   npm run seed         # loads .env.local, needs SANITY_API_WRITE_TOKEN
 *
 * It is idempotent — every document has a deterministic `_id` and is written
 * with `createOrReplace`, so re-running overwrites rather than duplicating. That
 * also makes it the migration's correctness check: seed, then confirm the site
 * renders identically to the pre-Sanity build. If it does, the schema is
 * faithful. Once seeded you can revoke the write token; nothing reads it at
 * runtime.
 *
 * Source of truth for the copy is the same files the site shipped with, so the
 * seed can't drift from what was live — the hero and marquee strings, which
 * lived inline in their components, are the only ones restated here.
 */

import { createClient } from "@sanity/client";

import { CASES } from "../lib/cases";
import {
  CAPABILITIES,
  CLIENT_LOCKUPS,
  CONTRAST_WITH,
  CONTRAST_WITHOUT,
  FAQS,
  MANIFESTO_KEEP,
  MANIFESTO_LEAD,
  PRICING_TIERS,
  SITE,
  SOCIALS,
  STATS,
  STEPS,
  TEAM,
  TESTIMONIALS,
} from "../lib/content";
import { ROLES } from "../lib/roles";

// Copy that lived inline in components/Hero.tsx and components/LogoMarquee.tsx.
const HERO = {
  eyebrow: "Enterprise AI · Cognitive infrastructure",
  subhead:
    "One stack that connects your data, compute, and models — engineered so your teams ship mission-critical AI, not plumbing.",
  ctaPrimary: "Start a project →",
  ctaSecondary: "See our work ▸",
};
const LOGO_MARQUEE_HEADING = "Trusted by 120+ engineering teams building at scale";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
const token = process.env.SANITY_API_WRITE_TOKEN;

if (!projectId || !token) {
  console.error(
    "Missing config. Set NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_API_WRITE_TOKEN " +
      "in .env.local, then run `npm run seed` (which loads that file).",
  );
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: "2025-01-01",
  useCdn: false,
});

/** Sanity requires a stable `_key` on every array-of-object item. */
let keyCounter = 0;
const keyed = <T extends object>(item: T): T & { _key: string } => ({
  _key: `k${(keyCounter++).toString(36)}`,
  ...item,
});

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Document IDs are hyphenated (`role-<slug>`), never dotted (`role.<slug>`).
 * This matters: on a *public* dataset, Sanity's anonymous read grant does NOT
 * expose documents whose `_id` contains a `.`, so dotted IDs are invisible to
 * any tokenless reader — which is every CI run and every Vercel build that
 * doesn't carry a read token. Dotted IDs made the live `/work` and `/careers`
 * render empty while local (tokened) reads looked fine. Keep them dotless.
 * (The queries key off `slug.current`, not `_id`, so the ID format is free to
 * change without touching lib/sanity/queries.ts.)
 */
type SeedDoc = { _id: string; _type: string; [key: string]: unknown };

function buildDocs() {
  const docs: SeedDoc[] = [];

  ROLES.forEach((r, i) =>
    docs.push({
      _id: `role-${r.slug}`,
      _type: "role",
      order: i,
      slug: { _type: "slug", current: r.slug },
      title: r.title,
      meta: r.meta,
      team: r.team,
      location: r.location,
      type: r.type,
      salary: r.salary,
      lede: r.lede,
      about: [...r.about],
      responsibilities: [...r.responsibilities],
      requirements: [...r.requirements],
      bonus: [...r.bonus],
    }),
  );

  CASES.forEach((c, i) =>
    docs.push({
      _id: `case-${c.slug}`,
      _type: "caseStudy",
      order: i,
      slug: { _type: "slug", current: c.slug },
      client: c.client,
      industry: c.industry,
      tags: [...c.tags],
      lede: c.lede,
      summary: c.summary,
      challenge: [...c.challenge],
      approach: [...c.approach],
      outcome: [...c.outcome],
      stack: [...c.stack],
      metrics: c.metrics.map((m) => keyed({ v: m.v, l: m.l, lime: m.lime })),
      duration: c.duration,
      regions: c.regions,
      featured: c.featured ?? false,
    }),
  );

  TESTIMONIALS.forEach((t, i) =>
    docs.push({
      _id: `testimonial-${t.index}`,
      _type: "testimonial",
      order: i,
      quote: t.quote,
      index: t.index,
      role: t.role,
      org: t.org,
    }),
  );

  TEAM.forEach((m, i) =>
    docs.push({ _id: `team-${slugify(m.n)}`, _type: "teamMember", order: i, i: m.i, n: m.n, r: m.r }),
  );

  FAQS.forEach((f, i) =>
    docs.push({ _id: `faq-${i}`, _type: "faq", order: i, q: f.q, a: f.a }),
  );

  PRICING_TIERS.forEach((p, i) =>
    docs.push({
      _id: `pricing-${slugify(p.name)}`,
      _type: "pricingTier",
      order: i,
      name: p.name,
      blurb: p.blurb,
      price: p.price,
      annualPrice: p.annualPrice,
      period: p.period,
      annualNote: p.annualNote,
      badge: p.badge,
      cta: p.cta,
      highlighted: p.highlighted,
      features: [...p.features],
    }),
  );

  docs.push({
    _id: "homepage",
    _type: "homepage",
    heroEyebrow: HERO.eyebrow,
    heroSubhead: HERO.subhead,
    heroCtaPrimary: HERO.ctaPrimary,
    heroCtaSecondary: HERO.ctaSecondary,
    capabilities: CAPABILITIES.map((c) =>
      keyed({ n: c.n, title: c.title, points: [...c.points], metric: c.metric, metricLabel: c.metricLabel }),
    ),
    processSteps: STEPS.map((s) => keyed({ n: s.n, t: s.t, d: s.d })),
    stats: STATS.map((s) => keyed({ v: s.v, l: s.l })),
    contrastWithout: [...CONTRAST_WITHOUT],
    contrastWith: [...CONTRAST_WITH],
    manifestoLead: MANIFESTO_LEAD,
    manifestoKeep: MANIFESTO_KEEP,
    logoMarqueeHeading: LOGO_MARQUEE_HEADING,
    clientLockups: CLIENT_LOCKUPS.map((c) =>
      keyed({ name: c.name, className: c.className, dotted: c.dotted }),
    ),
  });

  docs.push({
    _id: "siteSettings",
    _type: "siteSettings",
    name: SITE.name,
    email: SITE.email,
    phone: SITE.phone,
    phoneHref: SITE.phoneHref,
    location: SITE.location,
    version: SITE.version,
    socials: SOCIALS.map((s) => keyed({ label: s.label, href: s.href })),
  });

  return docs;
}

async function seed() {
  const docs = buildDocs();
  const tx = docs.reduce((t, doc) => t.createOrReplace(doc), client.transaction());

  console.log(`Writing ${docs.length} documents to ${projectId}/${dataset}…`);
  await tx.commit();

  const byType = docs.reduce<Record<string, number>>((acc, d) => {
    acc[d._type] = (acc[d._type] ?? 0) + 1;
    return acc;
  }, {});
  console.log("Done:", byType);
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
