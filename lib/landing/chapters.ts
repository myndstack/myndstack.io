/**
 * Structure of the "Full Spectrum" landing — what stays in code rather than
 * Sanity (see the README's Content table): chapter ids and their order, which
 * hue each discipline owns, the stack's discipline map, and the illustrative
 * spec snippets. Editorial copy (hero eyebrow/subhead, capabilities, steps,
 * FAQs, pricing, cases) comes from Sanity.
 *
 * Nothing here is a claim: labels name disciplines, snippets illustrate how a
 * build is shaped, and the HUD values (coordinates, clock, build) are facts.
 * Copy marked DRAFT is awaiting the owner's approval.
 */
import type { Hue } from "@/lib/motion/tokens";

/** The headline — structure, not copy (it is the concept the Core acts out). */
export const LANDING_HEADLINE = { lead: "Architected and built,", accent: "end to end." } as const;

/** Where the studio is. Shown in the hero HUD next to the live IST clock. */
export const STUDIO_COORDS = "11.05°N 76.07°E";

/** DRAFT — the line that scrolls past while the Core dives. */
export const DIVE_STATEMENT = "One studio. Every layer. Nothing handed off.";

/** DRAFT — the capabilities finale, after the ring closes. */
export const FINALE = {
  kicker: "The full spectrum",
  line: "Four disciplines, one accountable team — from first sketch to production.",
} as const;

/** DRAFT — the closing CTA band. */
export const CLOSING = {
  kicker: "Start here",
  title: "Let’s build the whole thing.",
} as const;

/** The scroll ruler's chapters, in page order. `id` is the anchor. */
export const RULER_CHAPTERS = [
  { id: "top", n: "01", label: "Intro" },
  { id: "platform", n: "02", label: "Stack" },
  { id: "capabilities", n: "03", label: "Capabilities" },
  { id: "work-cases", n: "04", label: "Work" },
  { id: "process", n: "05", label: "Process" },
  { id: "integrations", n: "06", label: "Tools" },
  { id: "team", n: "07", label: "Studio" },
  { id: "pricing", n: "08", label: "Pricing" },
  { id: "faq", n: "09", label: "FAQ" },
  { id: "contact", n: "10", label: "Contact" },
] as const;

/** Hue per capability chapter, in the Sanity capabilities' order (01–04). */
export const CAPABILITY_HUES: readonly Exclude<Hue, "lime">[] = ["ai", "product", "design", "arch"];

/**
 * The four stack plates (titles from STACK_LAYERS), with landing-local meta:
 * the live `/` still says "3 regions", an unverified claim this page drops.
 */
export const PLATFORM_LAYERS = [
  { n: "01", title: "Interface", meta: "Web · mobile · agents" },
  { n: "02", title: "Models", meta: "Serving · routing · evals" },
  { n: "03", title: "Compute", meta: "APIs · autoscale · infra" },
  { n: "04", title: "Data", meta: "Ingest · vector · governance" },
] as const;

/** DRAFT — the Platform chapter's copy. */
export const PLATFORM_COPY = {
  kicker: "The stack",
  title: ["Four layers.", "One team."],
  lede: "We architect and build every layer your product runs on — interface, models, compute and data — so nothing is glue code someone else owns.",
} as const;

/** Which hue each plate lights in when it locks (paper: the -deep variants). */
export const PLATFORM_HUES: readonly Hue[] = ["product", "ai", "arch", "lime"];

/** DRAFT — disciplines that feed each plate (leader lines draw into it). */
export const DISCIPLINES: readonly { readonly label: string; readonly layer: 0 | 1 | 2 | 3 }[] = [
  { label: "Web apps", layer: 0 },
  { label: "Mobile apps", layer: 0 },
  { label: "Design systems", layer: 0 },
  { label: "LLM apps", layer: 1 },
  { label: "Agents", layer: 1 },
  { label: "RAG & evals", layer: 1 },
  { label: "APIs & services", layer: 2 },
  { label: "Cloud infra", layer: 2 },
  { label: "MLOps", layer: 2 },
  { label: "Data pipelines", layer: 3 },
  { label: "Warehousing", layer: 3 },
  { label: "Access & security", layer: 3 },
];

/** DRAFT — the spec panel beside each capability: how a build is shaped. */
export const CAPABILITY_SPECS: readonly { readonly file: string; readonly lines: readonly string[] }[] = [
  {
    file: "agent.config.ts",
    lines: [
      "export const triage = agent({",
      "  model: route(['claude', 'fallback']),",
      "  tools: [search, crm, tickets],",
      "  evals: ['grounded', 'safe', 'on-task'],",
      "  gate: 'human-review',",
      "});",
    ],
  },
  {
    file: "app/routes.tsx",
    lines: [
      "<App targets={['web', 'ios', 'android']}>",
      "  <Route path='/' element={<Home />} />",
      "  <Route path='/orders/:id' element={<Order />} />",
      "  <OfflineSync strategy='queue' />",
      "</App>",
    ],
  },
  {
    file: "migrate.plan.ts",
    lines: [
      "legacy.strangle({",
      "  from: 'monolith@v1',",
      "  to: ['orders', 'billing', 'auth'],",
      "  tokens: 'design-system@2',",
      "  cutover: 'per-route',",
      "});",
    ],
  },
  {
    file: "delivery.yml",
    lines: [
      "pipeline:",
      "  - commit: [lint, test, typecheck]",
      "  - build:  [scan, sbom]",
      "  - deploy: { canary: 10%, watch: 15m }",
      "  - prod:   { observe: [slo, cost] }",
    ],
  },
];
