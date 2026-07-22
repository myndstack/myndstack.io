export type Role = {
  slug: string;
  title: string;
  /** Short line shown on the homepage row and the listing card. */
  meta: string;
  team: string;
  location: string;
  type: string;
  salary: string;
  lede: string;
  about: string[];
  responsibilities: string[];
  requirements: string[];
  bonus: string[];
};

export const ROLES: readonly Role[] = [
  {
    slug: "staff-platform-engineer",
    title: "Staff platform engineer",
    meta: "Remote · Infra",
    team: "Infrastructure",
    location: "Remote (IST ±4)",
    type: "Full-time",
    salary: "Competitive · equity",
    lede: "Own the compute and data planes underneath every stack we ship — the layer clients never see and can never afford to have fail.",
    about: [
      "You'll work on the substrate: multi-region compute scheduling, autoscaling under bursty inference load, and the storage and networking seams that everything above depends on.",
      "This is a small team with real ownership. You will not be handed a ticket queue — you'll be handed a constraint and trusted to design your way out of it.",
    ],
    responsibilities: [
      "Design and operate multi-region GPU compute with predictable cost and 99.99% availability",
      "Own infrastructure-as-code, CI, and the deployment path from merge to production",
      "Set the reliability bar: SLOs, error budgets, on-call practice, and post-incident review",
      "Work directly with client engineering teams during embedded engagements",
    ],
    requirements: [
      "6+ years building and operating production distributed systems",
      "Deep Kubernetes and cloud-provider experience, and the scars to go with it",
      "Fluency in a systems language — Go, Rust, or equivalent",
      "You've been on-call for something that mattered, and improved it",
    ],
    bonus: [
      "GPU scheduling or inference-serving experience",
      "Experience in a consulting or embedded-engineering model",
    ],
  },
  {
    slug: "ml-systems-engineer",
    title: "ML systems engineer",
    meta: "Remote · Models",
    team: "Models",
    location: "Remote (IST ±4)",
    type: "Full-time",
    salary: "Competitive · equity",
    lede: "Make model serving boring: routing, fallback, evaluation, and guardrails that hold up when a client's traffic triples overnight.",
    about: [
      "You'll sit between research output and production reality — taking models that work in a notebook and making them serve at 12ms p50 with a contract behind the number.",
      "Expect to spend as much time on evaluation harnesses and failure modes as on throughput.",
    ],
    responsibilities: [
      "Build and tune the model-serving path: batching, caching, routing, and fallback",
      "Own the evaluation harness — offline benchmarks and online quality signals",
      "Design guardrails, and the observability to prove they're working",
      "Advise clients on build-vs-buy and model selection with evidence, not vibes",
    ],
    requirements: [
      "4+ years shipping ML systems to production, not just training them",
      "Strong Python, and comfort dropping into a lower-level language when latency demands it",
      "Hands-on with inference servers and the throughput/latency trade-offs they force",
      "You can explain a p99 regression to a non-specialist stakeholder",
    ],
    bonus: [
      "Experience with LLM serving, agent orchestration, or retrieval systems",
      "Published evaluation or benchmarking work",
    ],
  },
  {
    slug: "product-designer",
    title: "Product designer",
    meta: "Remote · Design",
    team: "Design",
    location: "Remote (IST ±4)",
    type: "Full-time",
    salary: "Competitive · equity",
    lede: "Design the surfaces on top of the stack — developer tooling, dashboards, and the client-facing products we build alongside them.",
    about: [
      "This is a design role for someone who likes constraints and dense information. Most of what you'll design is operated by engineers under time pressure.",
      "You'll own the design system as a working artefact, not a slide deck — shipped as components, in the codebase.",
    ],
    responsibilities: [
      "Design developer tooling and operational interfaces end to end",
      "Own and evolve the design system, in close partnership with engineering",
      "Turn ambiguous client problems into flows that survive contact with real data",
      "Prototype in code where it's faster than arguing in Figma",
    ],
    requirements: [
      "4+ years designing complex software — tooling, infrastructure, or data products",
      "A portfolio showing systems thinking, not just screens",
      "Comfortable with HTML and CSS, and reading the components you designed",
      "You write clearly; much of the job is written argument",
    ],
    bonus: [
      "Experience designing for developers as the primary user",
      "Motion and interaction design depth",
    ],
  },
  {
    slug: "solutions-architect",
    title: "Solutions architect",
    meta: "Remote · Studio",
    team: "Studio",
    location: "Remote (IST ±4)",
    type: "Full-time",
    salary: "Competitive · equity",
    lede: "Be the first engineer in the room — map a client's terrain, architect the stack, and stay through to production.",
    about: [
      "You'll run the first working session, write the architecture, and then build it with the client team rather than handing over a document.",
      "This role suits someone who is genuinely senior technically and equally comfortable in front of a CTO.",
    ],
    responsibilities: [
      "Lead discovery: pin the problem, the constraints, and the fastest path to value",
      "Author the architecture across data, compute, and model layers",
      "Embed with client teams and ship in their codebase",
      "Bring patterns back — what you learn on one engagement becomes platform capability",
    ],
    requirements: [
      "8+ years in software, including significant time as a hands-on architect",
      "You've modernised a legacy system incrementally, without a rewrite",
      "Excellent written and verbal communication with technical and executive audiences",
      "Comfortable with the ambiguity of week one on a new engagement",
    ],
    bonus: [
      "Prior consulting or agency experience",
      "Regulated-industry exposure — finance, healthcare, or energy",
    ],
  },
];

export const getRole = (slug: string) => ROLES.find((r) => r.slug === slug);
