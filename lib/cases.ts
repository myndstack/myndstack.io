/**
 * Case studies.
 *
 * PLACEHOLDER CONTENT. The clients, figures and narratives here are invented to
 * exercise the layout — they came from the design handoff and were fleshed out to
 * full length so the pages read correctly in review. Replace every entry before
 * launch; see the pre-launch list in the README.
 *
 * Shape mirrors lib/roles.ts, and the routes mirror /careers — same PageHeader,
 * same metric grid, same prose treatment.
 */

export type CaseMetric = {
  v: string;
  l: string;
  /** One metric per case is accented; the headline number. */
  lime?: boolean;
};

export type CaseStudy = {
  slug: string;
  client: string;
  industry: string;
  tags: readonly string[];
  /** One line, used as the page lede. */
  lede: string;
  /** Card body on the homepage and the /work index. */
  summary: string;
  challenge: string[];
  approach: string[];
  outcome: string[];
  stack: readonly string[];
  /** Cards show the first two; the featured block and detail page show all. */
  metrics: readonly CaseMetric[];
  duration: string;
  regions: string;
  /** Exactly one case is featured — it gets the wide card on the homepage. */
  featured?: boolean;
};

export const CASES: readonly CaseStudy[] = [
  {
    slug: "northwind-logistics",
    client: "Northwind Logistics",
    industry: "Logistics",
    tags: ["Logistics", "Model serving"],
    featured: true,
    lede: "Real-time routing intelligence unified across three regions — one inference API replacing a brittle six-vendor pipeline.",
    summary:
      "Real-time routing intelligence unified across three regions — one inference API replacing a brittle six-vendor pipeline.",
    challenge: [
      "Routing decisions were spread across six vendors: one for geocoding, two for traffic, one for demand forecasting, and two more for the optimisation itself. Each had its own SLA, its own failure mode, and its own idea of what a shipment looked like.",
      "The glue between them was a Python service nobody on the current team had written. It carried no tests, and a single vendor timeout could stall dispatch for an entire region. Adding a fourth region had been on the roadmap for two years.",
    ],
    approach: [
      "We started by drawing the actual data flow rather than the one on the architecture diagram, and found four places where the same shipment was being re-geocoded within a single request.",
      "The replacement is one inference API in front of a routing model we serve ourselves, with the vendor calls that genuinely add value reduced to enrichment steps behind a cache. Everything else was deleted.",
      "Rollout ran region by region behind a traffic split, with the old pipeline kept warm for a full quarter so any regression could be reversed in minutes rather than days.",
    ],
    outcome: [
      "Dispatch now runs on a single API with one SLA and one owner. The fourth region went live eleven weeks after the third, against a two-year stall on the old stack.",
      "Cost fell mostly by deleting redundant vendor calls rather than by negotiating rates — the same journey had been paid for four times.",
    ],
    stack: ["Model serving", "Multi-region compute", "Vector cache", "Traffic splitting"],
    metrics: [
      { v: "62%", l: "lower cost" },
      { v: "12ms", l: "p50 latency" },
      { v: "3", l: "regions live", lime: true },
      { v: "99.99%", l: "uptime" },
    ],
    duration: "7 months",
    regions: "3 regions",
  },

  {
    slug: "aperture-health",
    client: "Aperture Health",
    industry: "Healthcare",
    tags: ["Healthcare"],
    lede: "Clinical decision support served on governed, region-pinned patient data — without the data ever leaving its jurisdiction.",
    summary:
      "Clinical decision support served on governed, region-pinned patient data.",
    challenge: [
      "Clinicians needed decision support at the point of care, but patient records could not leave their jurisdiction, and the model the clinical team wanted to use was hosted somewhere that guaranteed nothing about where inference ran.",
      "Earlier attempts had stalled on the same question every time: how do you evaluate a clinical model when you cannot pool the data you would need to evaluate it against?",
    ],
    approach: [
      "Inference runs inside each jurisdiction, pinned to region, with the model shipped to the data rather than the reverse. No patient record crosses a border at any point in the request path.",
      "Evaluation runs against a federated harness: each region reports aggregate quality metrics on its own data, and only those aggregates are compared centrally.",
      "Every inference is logged with the model version and the inputs that produced it, because a clinical recommendation nobody can reconstruct six months later is not usable evidence.",
    ],
    outcome: [
      "Decision support is live in production with a full audit trail per inference, and the compliance review that had blocked two previous attempts cleared in a single pass.",
      "Response times sit well inside the threshold where clinicians will actually wait for an answer rather than routing around the tool.",
    ],
    stack: ["Region-pinned inference", "Federated eval", "Audit logging", "Governance"],
    metrics: [
      { v: "99.99%", l: "uptime" },
      { v: "<50ms", l: "response", lime: true },
      { v: "0", l: "records crossing borders" },
      { v: "100%", l: "inferences audited" },
    ],
    duration: "9 months",
    regions: "2 jurisdictions",
  },

  {
    slug: "meridian-bank",
    client: "Meridian Bank",
    industry: "FinTech",
    tags: ["FinTech"],
    lede: "A legacy core banking platform modernised into cloud-native services, migrated incrementally, with zero downtime.",
    summary:
      "Legacy core banking modernized into cloud-native services, with zero downtime.",
    challenge: [
      "The core ran on a system whose original authors had retired. It worked, which was the problem: nobody could justify the risk of touching it, so every new product was built as another integration around the outside.",
      "Two previous rewrite attempts had been cancelled. Both were big-bang cutovers, and both ran out of political capital before they ran out of code.",
    ],
    approach: [
      "No rewrite. We put a facade in front of the core and moved capabilities behind it one at a time, so the old system and the new services served the same traffic during every migration step.",
      "Each capability moved only once its replacement had run in shadow mode against production traffic for long enough to prove parity — including the edge cases the original team had encoded and never documented.",
      "The order was chosen by risk, not by ease. The pieces that scared people most moved first, while the appetite to reverse them still existed.",
    ],
    outcome: [
      "Forty-plus services now sit behind the facade, with the remaining core reduced to a shrinking set of ledger operations on a documented path out.",
      "The migration completed without a maintenance window. Not one customer-visible outage was attributed to it.",
    ],
    stack: ["Strangler facade", "Shadow traffic", "Event sourcing", "Cloud-native services"],
    metrics: [
      { v: "40+", l: "services" },
      { v: "0", l: "downtime", lime: true },
      { v: "0", l: "rollbacks" },
      { v: "18mo", l: "migration" },
    ],
    duration: "18 months",
    regions: "1 region",
  },

  {
    slug: "helios-energy",
    client: "Helios Energy",
    industry: "Energy",
    tags: ["Energy"],
    lede: "Grid-scale demand-forecasting agents deployed across a national network, where being wrong is expensive in both directions.",
    summary:
      "Grid-scale demand-forecasting agents deployed across the national network.",
    challenge: [
      "Demand forecasting drove real procurement decisions, and the existing model was tuned on a grid that no longer existed — distributed generation had changed the shape of the load curve faster than the model was retrained.",
      "Under-forecasting meant buying on the spot market at the worst possible moment. Over-forecasting meant paying for generation nobody used. Both errors were costly, and the model treated them as equivalent.",
    ],
    approach: [
      "Forecasting agents run per region and are retrained on a schedule tied to how fast that region's generation mix is actually changing, rather than a fixed cadence chosen years earlier.",
      "The loss function was reweighted to reflect the real asymmetry between over- and under-forecasting, which mattered more to the outcome than any architectural change we made.",
      "Every forecast ships with a confidence band, and procurement thresholds are set against the band rather than the point estimate.",
    ],
    outcome: [
      "Efficiency gains came from the operators trusting the confidence bands enough to act on them — a forecast nobody acts on is worth nothing regardless of its accuracy.",
      "Retraining now runs without engineering involvement, so the model tracks the grid instead of drifting behind it.",
    ],
    stack: ["Forecasting agents", "Scheduled retraining", "Confidence intervals", "3 regions"],
    metrics: [
      { v: "8%", l: "efficiency", lime: true },
      { v: "3", l: "regions" },
      { v: "24/7", l: "autonomous retrain" },
      { v: "0", l: "manual interventions" },
    ],
    duration: "11 months",
    regions: "3 regions",
  },
];

export const getCase = (slug: string) => CASES.find((c) => c.slug === slug);

export const FEATURED_CASE = CASES.find((c) => c.featured) ?? CASES[0];
/** The non-featured cases, in the order the homepage grid shows them. */
export const SUPPORTING_CASES = CASES.filter((c) => !c.featured);
