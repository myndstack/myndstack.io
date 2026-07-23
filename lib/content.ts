/**
 * All copy and data for the single marketing page.
 * Kept here so sections stay presentational and content is editable in one place.
 */

/** Canonical origin. Override per-environment with NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://myndstack.io";

export const SITE = {
  name: "Myndstack",
  email: "hello@myndstack.io",
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
  { label: "X", href: null },
  { label: "LinkedIn", href: null },
  { label: "GitHub", href: null },
  { label: "Instagram", href: null },
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
  },
  {
    quote:
      "“The most engineered team we’ve worked with. Calm, precise, and fast — exactly the stack you want under something critical.”",
    index: "02",
    role: "Chief Technology Officer",
    org: "Clinical software",
  },
  {
    quote:
      "“Our digital transformation moved from roadmap to reality. 99.99% uptime and no glue code left to maintain.”",
    index: "03",
    role: "Founder",
    org: "Energy analytics",
  },
] as const;

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

export const LEGAL_LINKS = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Security", href: "/security" },
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
] as const;
