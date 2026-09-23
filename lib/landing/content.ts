/**
 * Structure for the redesigned landing (/preview): section ids, blueprint
 * annotations, diagram labels. Per the README's Content table, structure the
 * code is written against stays in code; editorial copy comes from Sanity.
 *
 * DRAFT COPY for owner approval (chapter kickers + FIG annotations). Nothing
 * here states a fact about a client, a metric or a person — those come from
 * Sanity (cases, site settings) and are never invented.
 */

/** The hero headline, one entry per line. Kept in code (README: hero words). */
export const LANDING_HEADLINE = ["Architected and built,", "end to end."] as const;

/** Blueprint figure labels, one per chapter. */
export const FIG = {
  hero: "FIG.01 — System overview",
  contrast: "FIG.02 — Without / with",
  stack: "FIG.03 — The stack",
  pipeline: "FIG.04 — Pipeline · PharmaLaunch",
  capabilities: "FIG.05 — Capabilities",
  pricing: "FIG.06 — Scope",
  process: "FIG.07 — Process",
  founder: "FIG.08 — Founder",
  demo: "FIG.09 — How we build",
  faq: "FIG.10 — Questions",
  cta: "FIG.11 — Next step",
  contact: "FIG.12 — Contact",
} as const;

/** Hero system diagram: data → model → product. */
export const HERO_NODES = [
  { id: "data", label: "Data", note: "your cloud" },
  { id: "model", label: "Model", note: "eval-gated" },
  { id: "product", label: "Product", note: "web · mobile" },
] as const;

/**
 * The Work pipeline's stages, as PharmaLaunch runs them: a brief goes in, AI
 * drafts, a deterministic rule engine checks, quality gates run (~29 per run,
 * drawn as three), and an approved controlled document comes out.
 */
export const PIPELINE_STAGES = [
  { id: "brief", label: "Brief" },
  { id: "ai", label: "AI draft" },
  { id: "rules", label: "Rule engine" },
  { id: "qa1", label: "QA" },
  { id: "qa2", label: "QA" },
  { id: "qa3", label: "QA" },
  { id: "approved", label: "Approved" },
] as const;

/** Pipeline diagram boxes (SVG user units) — shared by the server markup and
 *  the motion builder, which must agree on the geometry exactly. */
export const PIPELINE_BOX = {
  row: { width: 1000, height: 200, pad: 70 },
  column: { width: 300, height: 560, pad: 40 },
} as const;

/** Sections still to be built on /preview, with their final anchor ids. */
export const LANDING_PLACEHOLDERS = {
  contrast: { fig: FIG.contrast, title: "Without / with", phase: 4 },
  capabilities: { fig: FIG.capabilities, title: "Capabilities & integrations", phase: 4 },
  pricing: { fig: FIG.pricing, title: "Pricing — scope slider", phase: 5 },
  process: { fig: FIG.process, title: "Process", phase: 4 },
  team: { fig: FIG.founder, title: "Founder", phase: 4 },
  demo: { fig: FIG.demo, title: "Live demo — how we build", phase: 5 },
  faq: { fig: FIG.faq, title: "FAQ", phase: 4 },
  cta: { fig: FIG.cta, title: "Call to action", phase: 4 },
  contact: { fig: FIG.contact, title: "Contact — write or book", phase: 5 },
} as const;
