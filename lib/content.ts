/**
 * Marketing-page data and types.
 *
 * MIND THE SPLIT — not everything here is live any more:
 *
 * - **Still live (edit here, ships on next deploy):** `SITE_URL`, `NAV_LINKS` /
 *   `SPY_IDS`, `FOOTER_COLUMNS`, `LEGAL_LINKS`, `STACK_LAYERS`, and the exported
 *   types (`Social`, `PricingTier`, `NavLink`). These are structure/routing the
 *   code is written against, deliberately kept out of the CMS.
 * - **Seed source only (editing has NO live effect):** `SITE`, `SOCIALS`,
 *   `CAPABILITIES`, `STEPS`, `STATS`, `CONTRAST_*`, `MANIFESTO_*`, `TESTIMONIALS`,
 *   `PRICING_TIERS`, `TEAM`, `FAQS`, `CLIENT_LOCKUPS`. The live site reads these
 *   from Sanity via lib/sanity/queries.ts; these consts remain only so
 *   scripts/seed-sanity.ts can import them. Edit this content in the Studio.
 */

const FALLBACK_SITE_URL = "https://myndstack.io";

/**
 * Canonical origin. Override per-environment with NEXT_PUBLIC_SITE_URL.
 *
 * Deliberately defensive, because this value feeds `metadataBase: new URL(...)`
 * in app/layout.tsx — and a `new URL()` throw there takes the *whole site's*
 * metadata down (no title, no canonical, no OG tags, on every route). A plain
 * `?? fallback` is not enough: `??` only catches `undefined`/`null`, so an env
 * var set to an empty string, to whitespace, or to a host with no scheme
 * ("myndstack.io") would sail through and then throw. Normalise and validate
 * here instead, so a misconfigured deployment degrades to the canonical domain
 * rather than shipping a site with no metadata.
 */
function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return FALLBACK_SITE_URL;

  // A bare host is the common mistake; give it the scheme it meant.
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    // Throws on anything URL() can't parse; strip any trailing slash so
    // `${SITE_URL}/path` never produces a double slash.
    return new URL(candidate).toString().replace(/\/$/, "");
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export const SITE_URL = resolveSiteUrl();

export const SITE = {
  name: "Myndstack",
  email: "hello@myndstack.io",
  supportEmail: "support@myndstack.io",
  grievanceEmail: "grievance@myndstack.io",
  phone: "+91 99465 60607",
  phoneHref: "tel:+919946560607",
  location: "Kerala, India",
  version: "v3 · api.myndstack.io",
} as const;

/**
 * Top-level navigation.
 *
 * `section` is the homepage element the scroll-spy watches. Links without one
 * are real routes, so they are neither spied on nor scrolled to — Careers goes
 * straight to the listing rather than the homepage teaser, which would need a
 * second click to reach the actual openings.
 *
 * Hash hrefs are root-relative so they still work from /careers and the legal
 * pages.
 */
export type NavLink = { label: string; href: string; section?: string };

export const NAV_LINKS: readonly NavLink[] = [
  { label: "Work", href: "/work" },
  { label: "Services", href: "/#work-grid", section: "work-grid" },
  { label: "Process", href: "/#process", section: "process" },
  { label: "Pricing", href: "/#pricing", section: "pricing" },
  { label: "Studio", href: "/#team", section: "team" },
  { label: "Careers", href: "/careers" },
];

/** Homepage section ids the scroll-spy tracks. */
export const SPY_IDS = NAV_LINKS.flatMap((l) => (l.section ? [l.section] : []));

/**
 * Profile URLs. `null` means not set up yet — the spine renders nothing for
 * those rather than a link that goes somewhere it doesn't claim to.
 */
export type Social = { label: string; href: string | null };

export const SOCIALS: readonly Social[] = [
  { label: "X", href: "https://x.com/myndstack" },
  { label: "LinkedIn", href: "https://linkedin.com/company/myndstack" },
  { label: "GitHub", href: "https://github.com/myndstack" },
  { label: "Instagram", href: "https://instagram.com/myndstack" },
];

export const STACK_LAYERS = [
  { n: "01", title: "Interface", meta: "SDK · API · agents" },
  { n: "02", title: "Models", meta: "serving · routing · eval" },
  { n: "03", title: "Compute", meta: "GPU · autoscale · 3 regions" },
  { n: "04", title: "Data", meta: "ingest · vector · governance" },
] as const;

export const CAPABILITIES = [
  {
    n: "01",
    title: "AI platforms",
    points: ["Model routing & fallback", "Agent orchestration", "Eval & guardrails"],
    metric: "12ms",
    metricLabel: "p50 serving",
  },
  {
    n: "02",
    title: "Digital transformation",
    points: ["Incremental migration", "Zero rip-and-replace", "Cloud-native rebuild"],
    metric: "0",
    metricLabel: "lines of glue",
  },
  {
    n: "03",
    title: "Consulting",
    points: ["Stack architecture review", "Build-vs-buy strategy", "Team enablement"],
    metric: "4 wk",
    metricLabel: "typical sprint",
  },
  {
    n: "04",
    title: "Web & product",
    points: ["Product design", "Full-stack build", "Design systems"],
    metric: "weeks",
    metricLabel: "to launch",
  },
] as const;

export const STEPS = [
  {
    n: "01",
    t: "Map the terrain",
    d: "One working session to pin the problem, the constraints, and the fastest path to value.",
  },
  {
    n: "02",
    t: "Architect the stack",
    d: "We design the data, compute, and model layers — and the seams between them.",
  },
  {
    n: "03",
    t: "Build together",
    d: "Embedded engineers ship in your codebase, in the open, from week one.",
  },
  {
    n: "04",
    t: "Ship to production",
    d: "3 regions, 99.99% SLA, 12ms p50 — and no glue code left behind.",
  },
] as const;

export const STATS = [
  { v: "99.99%", l: "platform uptime" },
  { v: "12ms", l: "p50 inference" },
  { v: "120+", l: "systems shipped" },
  { v: "3 regions", l: "deployed globally" },
] as const;

export const CONTRAST_WITHOUT = [
  "Six vendors, six SLAs to reconcile",
  "Glue code no single team owns",
  "Data copied across every system",
  "Weeks of plumbing before endpoint one",
  "Uptime no one will put in a contract",
] as const;

export const CONTRAST_WITH = [
  "One API, one SLA, one owner",
  "Zero glue code — ever",
  "Governed data, in place",
  "First endpoint in under a week",
  "99.99% uptime, contractual",
] as const;

export const MANIFESTO_LEAD =
  "Intelligence should run on infrastructure you trust. No glue code. No black boxes. No plumbing between you and production. Just one engineered stack — ";
export const MANIFESTO_KEEP = "every layer, one team.";

export const TESTIMONIALS = [
  {
    quote:
      "“Myndstack replaced six months of infra work with one API. We shipped our model to production in a week.”",
    index: "01",
    role: "VP Engineering",
    org: "Logistics platform",
    metric: "6→1",
    metricLabel: "months to first endpoint",
  },
  {
    quote:
      "“The most engineered team we’ve worked with. Calm, precise, and fast — exactly the stack you want under something critical.”",
    index: "02",
    role: "Chief Technology Officer",
    org: "Clinical software",
    metric: "0",
    metricLabel: "P1 incidents in year one",
  },
  {
    quote:
      "“Our digital transformation moved from roadmap to reality. 99.99% uptime and no glue code left to maintain.”",
    index: "03",
    role: "Founder",
    org: "Energy analytics",
    metric: "-42%",
    metricLabel: "run-rate infra spend",
  },
] as const;

/**
 * Currency + region buckets the site supports. Everything not in this union
 * falls back to US/USD via lib/region.ts. Add new codes here, in RegionalPrice,
 * in COUNTRY_TO_REGION, and in the picker — the type will keep them honest.
 */
export type RegionCode = "IN" | "US" | "EU" | "UK";

export type RegionalPrice = {
  region: RegionCode;
  currency: "INR" | "USD" | "EUR" | "GBP";
  symbol: "₹" | "$" | "€" | "£";
  /** Full formatted price string, e.g. "₹1,99,000" — stored as-is so marketing
   *  can pick psychological prices without a code change. */
  price: string;
  annualPrice?: string;
  period?: string;
  annualNote?: string;
  /** Displayed under the price. e.g. "excl. GST 18%". */
  taxNote?: string;
  /** One-liner listing local payment methods, e.g. "UPI · cards · netbanking". */
  paymentNote?: string;
};

export type PricingTier = {
  name: string;
  blurb: string;
  price: string;
  /** Shown instead of `price` when annual billing is selected. */
  annualPrice?: string;
  period?: string;
  annualNote?: string;
  badge?: string;
  cta: string;
  highlighted: boolean;
  features: readonly string[];
  /**
   * Optional per-region overlay. When present, the field on the matching
   * region wins; when absent, the tier's flat fields render as today.
   */
  regionalPrices?: readonly RegionalPrice[];
};

/**
 * Feature-by-tier comparison matrix for the "Compare all plans" table.
 *
 * Deliberately separate from each tier's `features` bullets — those are
 * marketing shorthand and stay short; this matrix is the exhaustive side-by-
 * side buyers want when evaluating tiers. Keeping them apart means changing
 * one doesn't churn the other.
 *
 * Row values: `true` renders a lime check, `false` renders an em dash, a
 * string renders literally (short — one or two words). Any tier missing from
 * a row's `values` object also renders as an em dash.
 */
export type CompareValue = true | false | string;

export type CompareRow = {
  label: string;
  hint?: string;
  values: Record<string, CompareValue>;
};

export type CompareSection = {
  title: string;
  rows: CompareRow[];
};

/** Tier names must match `PricingTier.name` — the table keys off them. */
export const PRICING_COMPARISON: readonly CompareSection[] = [
  {
    title: "Platform",
    rows: [
      {
        label: "Unified data + model API",
        values: {
          Platform: true,
          Scale: true,
          Projects: "As built",
          Studio: "As built",
        },
      },
      {
        label: "Endpoints",
        values: {
          Platform: "Up to 10",
          Scale: "Unlimited",
          Projects: "Per scope",
          Studio: "Per scope",
        },
      },
      {
        label: "Regions",
        values: {
          Platform: "1",
          Scale: "3",
          Projects: "Per scope",
          Studio: "Per scope",
        },
      },
      {
        label: "Vector storage",
        values: { Platform: true, Scale: true, Projects: true, Studio: true },
      },
    ],
  },
  {
    title: "Service level",
    rows: [
      {
        label: "SLA",
        values: {
          Platform: "—",
          Scale: "99.99%",
          Projects: "Per SOW",
          Studio: "Per SOW",
        },
      },
      {
        label: "p50 inference target",
        values: { Scale: "12ms" },
      },
      {
        label: "Dedicated solutions engineer",
        values: { Scale: true, Studio: true },
      },
    ],
  },
  {
    title: "Delivery",
    rows: [
      {
        label: "Design + engineering",
        values: { Projects: true, Studio: true },
      },
      { label: "Embedded team", values: { Studio: true } },
      { label: "Architecture consulting", values: { Studio: true } },
      {
        label: "Handover + documentation",
        values: { Projects: true, Studio: true },
      },
    ],
  },
  {
    title: "Support",
    rows: [
      { label: "Community", values: { Platform: true } },
      { label: "Business hours", values: { Scale: true, Projects: true } },
      { label: "24/7 on-call", values: { Studio: true } },
      { label: "Post-launch retainer", values: { Projects: "Optional", Studio: true } },
    ],
  },
];

/**
 * Reusable per-region tax + payment copy. Kept as a shared table so a policy
 * change (e.g. GST rate) needs one edit, not four.
 */
const REGION_NOTES: Record<RegionCode, { taxNote: string; paymentNote: string }> = {
  IN: { taxNote: "excl. GST 18%", paymentNote: "UPI · cards · netbanking · wallets" },
  US: { taxNote: "billed in USD", paymentNote: "cards" },
  EU: { taxNote: "excl. VAT (reverse charge for B2B)", paymentNote: "cards · SEPA" },
  UK: { taxNote: "excl. VAT", paymentNote: "cards" },
};

export const PRICING_TIERS: readonly PricingTier[] = [
  {
    name: "Platform",
    blurb: "Self-serve cognitive runtime",
    price: "$0",
    period: "/ start free",
    cta: "Start free",
    highlighted: false,
    features: [
      "Unified data + model API",
      "1 region, up to 10 endpoints",
      "Community support",
    ],
    // Free tier: currency symbol changes per region so the "0" reads right in
    // context, but there's no tax and no payment method to name.
    regionalPrices: [
      { region: "IN", currency: "INR", symbol: "₹", price: "₹0", period: "/ start free" },
      { region: "US", currency: "USD", symbol: "$", price: "$0", period: "/ start free" },
      { region: "EU", currency: "EUR", symbol: "€", price: "€0", period: "/ start free" },
      { region: "UK", currency: "GBP", symbol: "£", price: "£0", period: "/ start free" },
    ],
  },
  {
    name: "Scale",
    blurb: "Production AI in mission-critical apps",
    price: "$2,400",
    annualPrice: "$2,000",
    period: "/ mo",
    annualNote: "billed annually · 2 months free",
    badge: "Most teams",
    cta: "Start building",
    highlighted: true,
    features: [
      "Everything in Platform",
      "3 regions, unlimited endpoints",
      "99.99% SLA · 12ms p50",
      "Dedicated solutions engineer",
    ],
    // Placeholder marketing-set numbers — override in Sanity for real prices.
    regionalPrices: [
      {
        region: "IN",
        currency: "INR",
        symbol: "₹",
        price: "₹1,99,000",
        annualPrice: "₹1,65,000",
        period: "/ mo",
        annualNote: "billed annually · 2 months free",
        ...REGION_NOTES.IN,
      },
      {
        region: "US",
        currency: "USD",
        symbol: "$",
        price: "$2,400",
        annualPrice: "$2,000",
        period: "/ mo",
        annualNote: "billed annually · 2 months free",
        ...REGION_NOTES.US,
      },
      {
        region: "EU",
        currency: "EUR",
        symbol: "€",
        price: "€2,200",
        annualPrice: "€1,830",
        period: "/ mo",
        annualNote: "billed annually · 2 months free",
        ...REGION_NOTES.EU,
      },
      {
        region: "UK",
        currency: "GBP",
        symbol: "£",
        price: "£1,900",
        annualPrice: "£1,580",
        period: "/ mo",
        annualNote: "billed annually · 2 months free",
        ...REGION_NOTES.UK,
      },
    ],
  },
  {
    name: "Projects",
    blurb: "One-off web, app, and AI builds",
    price: "Fixed",
    period: "/ per scope",
    cta: "Request a quote",
    highlighted: false,
    features: [
      "Website, mobile app, or bespoke AI system",
      "Fixed scope, milestones, and price",
      "Design, engineering, and handover included",
      "Optional post-launch retainer",
    ],
    // Number is "Fixed" everywhere; only tax + payment vary.
    regionalPrices: [
      { region: "IN", currency: "INR", symbol: "₹", price: "Fixed", period: "/ per scope", ...REGION_NOTES.IN },
      { region: "US", currency: "USD", symbol: "$", price: "Fixed", period: "/ per scope", ...REGION_NOTES.US },
      { region: "EU", currency: "EUR", symbol: "€", price: "Fixed", period: "/ per scope", ...REGION_NOTES.EU },
      { region: "UK", currency: "GBP", symbol: "£", price: "Fixed", period: "/ per scope", ...REGION_NOTES.UK },
    ],
  },
  {
    name: "Studio",
    blurb: "We architect & build with you",
    price: "Custom",
    cta: "Talk to us",
    highlighted: false,
    features: [
      "Digital transformation programs",
      "Embedded engineering team",
      "Architecture & strategy consulting",
      "Enterprise security & compliance",
    ],
    // Priced per engagement, invoiced against the SOW. Payment note omitted —
    // there is no self-serve checkout for this tier.
    regionalPrices: [
      { region: "IN", currency: "INR", symbol: "₹", price: "Custom", taxNote: REGION_NOTES.IN.taxNote },
      { region: "US", currency: "USD", symbol: "$", price: "Custom", taxNote: REGION_NOTES.US.taxNote },
      { region: "EU", currency: "EUR", symbol: "€", price: "Custom", taxNote: REGION_NOTES.EU.taxNote },
      { region: "UK", currency: "GBP", symbol: "£", price: "Custom", taxNote: REGION_NOTES.UK.taxNote },
    ],
  },
];

export const TEAM = [
  { i: "AV", n: "Arjun Vale", r: "Founder · Principal architect" },
  { i: "NK", n: "Nina Kohl", r: "Head of AI systems" },
  { i: "TB", n: "Theo Brandt", r: "Lead platform engineer" },
  { i: "RM", n: "Rhea Menon", r: "Design & product" },
] as const;

export const FAQS = [
  {
    q: "What does Myndstack actually build?",
    a: "Cognitive infrastructure — the unified data, compute, and model layer beneath enterprise AI. We ship it as a platform, and we build mission-critical systems on it with your team.",
  },
  {
    q: "Do you work with startups as well as enterprise?",
    a: "Yes. Individual developers start free on the platform; startups scale on it; enterprises engage the studio for digital transformation and consulting at scale.",
  },
  {
    q: "How fast can we get to production?",
    a: "Most teams deploy their first endpoint in under a week. The Scale tier ships to 3 regions with a 99.99% SLA and 12ms p50 inference.",
  },
  {
    q: "Can you take over an existing legacy system?",
    a: "That’s the Studio engagement. We modernize legacy software into SaaS platforms incrementally — no rip-and-replace, no glue code left behind.",
  },
  {
    q: "What about security and compliance?",
    a: "Enterprise security and compliance are built into every engagement — dedicated environments, audit trails, and region-pinned data on request.",
  },
] as const;

/** Typographic client lockups for the logo marquee — styled text, not images. */
export type ClientLockup = { name: string; className: string; dotted?: boolean };

export const CLIENT_LOCKUPS: readonly ClientLockup[] = [
  { name: "NORTHWIND", className: "font-bold tracking-[0.06em]" },
  { name: "Aperture", className: "font-medium tracking-[-0.01em]" },
  { name: "QUANTA", className: "font-bold tracking-[0.14em]" },
  { name: "helios.ai", className: "font-normal", dotted: true },
  { name: "Vertex Labs", className: "font-semibold tracking-[-0.02em]" },
  { name: "MERIDIAN", className: "font-bold tracking-[0.1em]" },
  { name: "onyx", className: "font-medium tracking-[0.02em]" },
  { name: "Cobalt", className: "font-semibold tracking-[-0.01em]" },
];

/**
 * The vendor stack we plug into on customer engagements. Text-only so no
 * third-party marks or trademarks are reproduced from memory — the site
 * reflects reality, not a guessed SVG library. Buyer-facing purpose: signal
 * "we work with what you already run" without a wall of logos to police.
 */
export type IntegrationGroup = {
  /** UI heading. */
  title: string;
  /** Short line that sits under the heading. */
  blurb: string;
  /** Vendor names as plain strings — no branding assets embedded. */
  items: readonly string[];
};

export const INTEGRATIONS: readonly IntegrationGroup[] = [
  {
    title: "Models",
    blurb: "Route across providers with a single interface.",
    items: ["OpenAI", "Anthropic", "Google", "Mistral", "Meta Llama", "Cohere"],
  },
  {
    title: "Cloud",
    blurb: "Deploy where your data already lives.",
    items: ["AWS", "Google Cloud", "Azure", "Vercel", "Cloudflare"],
  },
  {
    title: "Data",
    blurb: "Query in place — no unnecessary copies.",
    items: ["Postgres", "Snowflake", "BigQuery", "Databricks", "Pinecone"],
  },
  {
    title: "Delivery",
    blurb: "Fits your existing shipping and observability.",
    items: ["GitHub", "GitLab", "Datadog", "Grafana", "Sentry"],
  },
];

export const LEGAL_LINKS = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Security", href: "/security" },
  { label: "Cookies", href: "/cookies" },
  { label: "Refunds", href: "/refunds" },
] as const;

export const FOOTER_COLUMNS = [
  {
    title: "Platform",
    links: [
      { label: "AI platforms", href: "/#work-grid" },
      { label: "Consulting", href: "/#work-grid" },
      { label: "Pricing", href: "/#pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Studio", href: "/#team" },
      { label: "Careers", href: "/careers" },
      { label: "FAQ", href: "/#faq" },
      { label: "Contact", href: "/#contact" },
    ],
  },
  {
    title: "Trust",
    links: [
      { label: "Acceptable use", href: "/acceptable-use" },
      { label: "Responsible AI", href: "/responsible-ai" },
      { label: "SLA", href: "/sla" },
      { label: "DPA", href: "/dpa" },
      { label: "Subprocessors", href: "/subprocessors" },
      { label: "All policies", href: "/legal" },
    ],
  },
] as const;
