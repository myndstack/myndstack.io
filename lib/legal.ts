import { SITE } from "./content";

/**
 * Legal copy. This is a reasonable starting draft for a services company —
 * have counsel review it before launch, and update LAST_UPDATED when you do.
 */

export const LAST_UPDATED = "28 July 2026";

export type LegalSection = { heading: string; body: string[] };

export type LegalDoc = {
  slug:
    | "privacy"
    | "terms"
    | "security"
    | "refunds"
    | "cookies"
    | "dpa"
    | "subprocessors"
    | "responsible-ai";
  title: string;
  eyebrow: string;
  lede: string;
  sections: LegalSection[];
};

export const LEGAL_DOCS: Record<LegalDoc["slug"], LegalDoc> = {
  privacy: {
    slug: "privacy",
    title: "Privacy policy",
    eyebrow: "Legal · Privacy",
    lede: `How Myndstack collects, uses, and protects information when you use this site or engage us on a project.`,
    sections: [
      {
        heading: "What we collect",
        body: [
          "When you submit the contact form, the newsletter form, or a job application, we receive the details you enter: your name, email address, and whatever you choose to write in the free-text fields. Applications also include the links you share.",
          "We do not run advertising trackers, and we do not sell or rent personal information to anyone, in any circumstance.",
        ],
      },
      {
        heading: "Analytics",
        body: [
          "If analytics are enabled on this deployment, we use a privacy-preserving, cookie-free product that records aggregate page views and referrers. It does not set cookies, does not fingerprint your device, and does not build a cross-site profile of you.",
        ],
      },
      {
        heading: "Why we hold it",
        body: [
          "To reply to your enquiry, to run a hiring process you have entered, and to send you the newsletter if you asked for it. That is the whole list. We do not repurpose form submissions for unrelated marketing.",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          "Enquiries are retained for 24 months so we have context if you come back to us. Job applications are retained for 12 months unless you ask us to remove them sooner. Newsletter subscriptions are kept until you unsubscribe.",
        ],
      },
      {
        heading: "Who else sees it",
        body: [
          "Form submissions are delivered by our email provider and stored in our company mailbox. Our hosting provider processes standard server logs. A complete, current list is on the subprocessors page.",
        ],
      },
      {
        heading: "Payments",
        body: [
          "If you subscribe to a paid tier, card, UPI, netbanking, or wallet details are collected directly by our payment processor and never touch Myndstack systems. We are out of PCI-DSS scope: we receive only the transaction identifier, the amount, and whether the charge succeeded. The processors we use are named on the subprocessors page and may change over time.",
        ],
      },
      {
        heading: "Client data",
        body: [
          "Data belonging to our clients — anything processed inside a system we build or operate — is governed by the data processing agreement in that engagement, not by this policy. We do not use client data to train models or for any purpose outside the contract.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "You can ask for a copy of what we hold about you, ask us to correct it, or ask us to delete it. Write to us and we will action the request within 30 days.",
          `Contact: ${SITE.email}.`,
        ],
      },
      {
        heading: "Grievance officer",
        body: [
          "In line with the Digital Personal Data Protection Act, 2023, the Information Technology (Intermediary Guidelines) Rules, 2021, and the Consumer Protection (E-Commerce) Rules, 2020, we publish a Grievance Officer contact so that data-protection concerns, takedown requests, and consumer grievances reach a named person.",
          `Grievance Officer — ${SITE.grievanceOfficer}, ${SITE.legalName}. Email: ${SITE.grievanceEmail}. Post: Attention "Grievance Officer", ${SITE.legalName}, ${SITE.location}. We acknowledge every grievance within 48 hours and aim to resolve it within 30 days.`,
        ],
      },
    ],
  },

  terms: {
    slug: "terms",
    title: "Terms of use",
    eyebrow: "Legal · Terms",
    lede: `The terms that apply to this website. Terms for a paid engagement are set out in the agreement we sign with you, which takes precedence over anything here.`,
    sections: [
      {
        heading: "Using this site",
        body: [
          "You may read, link to, and quote this site with attribution. You may not scrape it at a rate that degrades service for others, attempt to gain unauthorised access, or misrepresent your identity when contacting us.",
        ],
      },
      {
        heading: "The content here is not a commitment",
        body: [
          "Product descriptions, metrics, pricing tiers, and timelines on this site are indicative. Nothing on this page is an offer capable of acceptance, and nothing here forms a contract. Figures such as uptime and latency describe past results on specific systems; they are not a guarantee about yours.",
        ],
      },
      {
        heading: "Engagements",
        body: [
          "Work is performed under a separate written agreement covering scope, fees, intellectual property, confidentiality, data processing, and service levels. Where that agreement and these terms disagree, that agreement wins.",
        ],
      },
      {
        heading: "Intellectual property",
        body: [
          "The Myndstack name, wordmark, and the design and content of this site belong to Myndstack. Client names and marks shown here belong to their respective owners and are used to describe work performed.",
        ],
      },
      {
        heading: "Liability",
        body: [
          "This site is provided as-is. To the extent the law allows, we are not liable for loss arising from your reliance on information published here. Nothing in these terms limits liability that cannot lawfully be limited.",
        ],
      },
      {
        heading: "Governing law",
        body: [
          "These terms are governed by the laws of India, and the courts of Kerala have exclusive jurisdiction over any dispute arising from them.",
        ],
      },
      {
        heading: "Changes",
        body: [
          "We may update these terms. The date at the top of this page reflects the most recent change.",
        ],
      },
    ],
  },

  security: {
    slug: "security",
    title: "Security",
    eyebrow: "Legal · Security",
    lede: `How we secure the systems we build and operate, and how to report a vulnerability to us.`,
    sections: [
      {
        heading: "Reporting a vulnerability",
        body: [
          `Email ${SITE.email} with the subject line "Security". Include the affected endpoint, reproduction steps, and any proof-of-concept. We aim to acknowledge within one business day and to give you a remediation timeline within five.`,
          "Please give us a reasonable window to fix an issue before disclosing it publicly. We will not pursue legal action against researchers who report in good faith, act within the scope of their own accounts, avoid privacy violations and service degradation, and do not exfiltrate data.",
        ],
      },
      {
        heading: "Out of scope",
        body: [
          "Reports generated solely by automated scanners without a demonstrated impact, missing best-practice headers with no exploit path, social engineering of our staff, and denial-of-service testing are all out of scope.",
        ],
      },
      {
        heading: "How we build",
        body: [
          "Least-privilege access, credentials in a managed secret store rather than in code, encryption in transit and at rest, dependency and container scanning in CI, and infrastructure defined as code and peer-reviewed before it lands.",
        ],
      },
      {
        heading: "Access control",
        body: [
          "Engineer access to client environments is granted per engagement, requires multi-factor authentication, is logged, and is revoked when the engagement ends. Production access is time-bound and audited.",
        ],
      },
      {
        heading: "Data residency",
        body: [
          "Region-pinned deployment is available where an engagement requires data to stay in a jurisdiction. Residency commitments are recorded in the data processing agreement, not assumed.",
        ],
      },
      {
        heading: "Incidents",
        body: [
          "We notify affected clients without undue delay after confirming an incident that touches their data, with what we know, what we are doing, and what we need from them. A written post-incident review follows.",
        ],
      },
      {
        heading: "Compliance",
        body: [
          "Enterprise security and compliance requirements are scoped per engagement. Ask us for our current posture, subprocessor list, and any certifications relevant to your programme.",
        ],
      },
    ],
  },

  refunds: {
    slug: "refunds",
    title: "Refunds & cancellation",
    eyebrow: "Legal · Refunds",
    lede: `How subscriptions start, stop, and get refunded — and how one-off project engagements are billed and cancelled. Anything covered by a signed statement of work or order form is governed by that document instead.`,
    sections: [
      {
        heading: "What this covers",
        body: [
          "Two things get paid for on this site. The first is a recurring subscription to the platform — Platform or Scale — billed monthly or annually. The second is a one-time project engagement — a website, an application, a bespoke AI build, a discovery sprint — quoted per piece of work and billed against milestones. The sections below are grouped that way.",
        ],
      },
      {
        heading: "Service delivery",
        body: [
          "Subscriptions are a digital service; there is nothing to ship. Your subscription is provisioned automatically as soon as our payment processor confirms a successful charge — typically within minutes. If you have paid and the account has not activated within an hour, contact us and we will fix it or refund the charge in full.",
          "Project engagements are delivered under the milestones set out in the statement of work — designs, builds, and handovers ship on the dates recorded there. Where there is a discrepancy between the SOW and this page, the SOW wins.",
        ],
      },
      {
        heading: "Free tier",
        body: [
          "The free Platform tier has no charge and no refund to make. You can stop using it at any time; ask us to delete your account and we will do so within 30 days.",
        ],
      },
      {
        heading: "Monthly plans",
        body: [
          "You can cancel a monthly plan at any time from your account or by writing to us. Cancellation stops the next renewal; the current month runs to the end of its cycle and is not pro-rated on cancellation. If you cancel because the service materially failed to work as described, and we cannot resolve it within a reasonable window, we will refund the unused portion of the month.",
        ],
      },
      {
        heading: "Annual plans",
        body: [
          "Annual plans are billed once for twelve months and include the two-months-free discount shown on the pricing page. You can cancel a renewal at any time. Mid-term refunds are calculated at the equivalent monthly rate (i.e. the annual discount is unwound) for the unused whole months, less any months already consumed.",
        ],
      },
      {
        heading: "Downgrades and upgrades",
        body: [
          "Upgrades take effect immediately and are pro-rated for the remainder of the cycle. Downgrades take effect at the start of the next cycle so that features you have already paid for remain available for the period you paid for them.",
        ],
      },
      {
        heading: "Project engagements",
        body: [
          "One-off engagements — a website build, a mobile app, a bespoke AI system, a discovery sprint — are governed by the statement of work we sign for that piece of work, which sets out milestones, fees, and payment terms. This section is the default position where the SOW is silent.",
          "Deposits and mobilisation fees are non-refundable once work has started, because the engineers, designers, and infrastructure they need are already committed. Payments against a delivered milestone are non-refundable once you have accepted the milestone, or thirty days have passed without you raising an objection.",
          "If you cancel a project part-way through, you are billed for hours worked and expenses incurred up to the date of cancellation, credited against any advance already paid. Unspent advance is refunded within fifteen business days, and we hand over the work-in-progress in the state it is in — designs, source, and documentation for what has been completed.",
          "If we cancel — which we would only do for a material breach on your side, or an event that makes lawful completion impossible — the same reconciliation applies in the other direction.",
        ],
      },
      {
        heading: "Failed and duplicate charges",
        body: [
          "If you were charged twice, or charged after a cancellation confirmation, contact us with the transaction reference and we will reverse the charge. Reversals normally reach the source instrument within 5–7 business days, subject to the payment processor's own timelines.",
        ],
      },
      {
        heading: "Chargebacks and disputes",
        body: [
          "Please talk to us before raising a chargeback with your bank — nine times in ten it is a billing question we can resolve the same day. If a chargeback is raised, the account may be suspended until the dispute is closed to avoid further charges accruing during the review.",
        ],
      },
      {
        heading: "How to request a refund",
        body: [
          `Email ${SITE.supportEmail} with the subject line "Refund", the account email or project reference, and the transaction reference. We acknowledge within one business day and confirm the outcome within seven. Unresolved refund requests can be escalated to our Grievance Officer through the process set out on the privacy page, and after that to the payment processor named on the subprocessors page.`,
        ],
      },
      {
        heading: "Governing law",
        body: [
          "This policy is governed by the laws of India, and the courts of Kerala have exclusive jurisdiction over any dispute arising from it.",
        ],
      },
    ],
  },

  cookies: {
    slug: "cookies",
    title: "Cookies",
    eyebrow: "Legal · Cookies",
    lede: `Whether we set cookies on this site, and what we do instead. Kept as a separate page so the answer is easy to find and easy to audit.`,
    sections: [
      {
        heading: "The short version",
        body: [
          "This marketing site does not set advertising cookies, does not set analytics cookies, and does not fingerprint your device. There is no consent banner because there is nothing to consent to.",
        ],
      },
      {
        heading: "Strictly necessary storage",
        body: [
          "If you sign in to a product account or submit a form, we may set a short-lived, first-party cookie or use browser storage for security reasons — for example a CSRF token or a session identifier. These are not used for tracking. They expire when you close the tab, or shortly after.",
          'The pricing section also sets two functional first-party cookies — "pref_region" (which currency and tax notes to show) and "pref_source" (whether the region was picked by you or auto-detected). Both last 60 days and are used only to keep the price you see consistent between visits.',
        ],
      },
      {
        heading: "Analytics",
        body: [
          "If analytics are enabled on this deployment, we use a privacy-preserving, cookie-free product that records aggregate page views and referrers. It does not set cookies, does not fingerprint your device, and does not build a cross-site profile of you. The vendor is named on the subprocessors page.",
        ],
      },
      {
        heading: "Third-party embeds",
        body: [
          "Where a page embeds a third-party resource — for example a scheduling widget, a video player, or a font — that provider may set its own cookies once you interact with the embed. We keep these to a minimum and prefer providers that do not set marketing cookies by default.",
        ],
      },
      {
        heading: "Changes",
        body: [
          "If we ever change this stance — for example, adding a cookie-based analytics or advertising product — we will update this page and, where the law requires, ask for your consent before the change takes effect.",
        ],
      },
    ],
  },

  dpa: {
    slug: "dpa",
    title: "Data Processing Addendum",
    eyebrow: "Legal · DPA",
    lede: `A template Data Processing Addendum that attaches to Scale and Studio agreements. Reproduced here for transparency; the executed version in your order form is the binding one.`,
    sections: [
      {
        heading: "Definitions",
        body: [
          "'Customer Data' means personal data you or your users route through Myndstack in the course of using the service. 'Controller' and 'Processor' carry the meanings given to them under the GDPR and equivalent Indian, UK, EU, and other applicable data-protection laws (including the Digital Personal Data Protection Act, 2023).",
        ],
      },
      {
        heading: "Roles",
        body: [
          "You are the Controller (or, where applicable, the Data Fiduciary) of Customer Data. Myndstack acts as your Processor (or Data Processor) and processes Customer Data only on your documented instructions, which include this DPA and the order form.",
        ],
      },
      {
        heading: "Scope of processing",
        body: [
          "We process Customer Data to operate the service you have subscribed to, to keep it secure, to bill you, and to respond to your support requests. We do not process Customer Data for our own purposes, and we do not use it to train models — ours or anyone else's.",
        ],
      },
      {
        heading: "Subprocessors",
        body: [
          "The current list of subprocessors is published on the subprocessors page. We give at least 30 days' notice before adding a new subprocessor to that list; you can object in writing within that window, and if we cannot accommodate the objection you can terminate the affected service for that reason.",
        ],
      },
      {
        heading: "International transfers",
        body: [
          "Where Customer Data leaves the jurisdiction it was collected in, we rely on Standard Contractual Clauses, the UK International Data Transfer Addendum, or an equivalent transfer mechanism recognised by the receiving country. Region-pinned deployment is available on request and, once agreed, is recorded in the order form.",
        ],
      },
      {
        heading: "Security measures",
        body: [
          "The measures we apply are the ones set out on the security page: least-privilege access, MFA-gated production access, encryption in transit and at rest, dependency and container scanning in CI, and infrastructure defined as code. Any material change to those measures during the term will not degrade the protections in place at signing.",
        ],
      },
      {
        heading: "Data subject rights",
        body: [
          "We help you respond to access, correction, deletion, restriction, and portability requests from your users. Where a request reaches us directly, we route it to you rather than actioning it ourselves.",
        ],
      },
      {
        heading: "Incidents",
        body: [
          "We notify you without undue delay — and in any event within 72 hours of confirming — a security incident affecting your Customer Data, together with what we know, what we are doing, and what we need from you.",
        ],
      },
      {
        heading: "Deletion and return",
        body: [
          "On termination we return or delete Customer Data on your instruction within 30 days, except where we are required by law to retain a copy. Backups are overwritten on their usual cycle.",
        ],
      },
      {
        heading: "Audit",
        body: [
          "You may request our current security posture, penetration-test summaries, and subprocessor list once every twelve months, or after a security incident affecting your data, and rely on third-party audit reports where they cover the control in question.",
        ],
      },
      {
        heading: "How to execute this",
        body: [
          `To sign a copy of this DPA under your paperwork rather than ours, email ${SITE.email} with the subject line "DPA" and we will countersign within five business days.`,
        ],
      },
    ],
  },

  subprocessors: {
    slug: "subprocessors",
    title: "Subprocessors",
    eyebrow: "Legal · Subprocessors",
    lede: `The third parties we rely on to run this site and the platform. Kept current so you can see what changes without having to ask.`,
    sections: [
      {
        heading: "Infrastructure",
        body: [
          "Vercel, Inc. — website hosting, edge caching, and serverless runtime for this site. Data centres in the United States and the European Union. Standard hosting logs only.",
        ],
      },
      {
        heading: "Content",
        body: [
          "Sanity.io — headless CMS storing the editable content on this site (case studies, roles, testimonials, and similar). Data hosted in the European Union.",
        ],
      },
      {
        heading: "Email",
        body: [
          "Resend, Inc. — delivery of transactional email (contact-form replies, newsletter, security notices). Data hosted in the United States, with European Union sub-processing available on request.",
        ],
      },
      {
        heading: "Payments",
        body: [
          "Razorpay Software Private Limited — collection of card, UPI, netbanking, and wallet payments for paid subscriptions. Data hosted in India. Card data never touches Myndstack systems; Razorpay is PCI-DSS Level 1 certified and is the party in PCI scope. We are actively evaluating additional processors — Stripe (international cards), Google Pay, and PhonePe (UPI) — and will list any that go live here at least 30 days before they process customer traffic.",
        ],
      },
      {
        heading: "CRM",
        body: [
          "HubSpot, Inc. — used when enabled on a deployment to sync contact-form submissions into our CRM so we do not lose an enquiry. Data hosted in the United States or the European Union depending on the account region.",
        ],
      },
      {
        heading: "Analytics",
        body: [
          "Plausible Analytics — used when enabled on a deployment for cookie-free, privacy-preserving traffic analytics. Data hosted in the European Union.",
        ],
      },
      {
        heading: "Scheduling",
        body: [
          "Cal.com, Inc. — used when a scheduling link is enabled, to book meetings with our team. Data hosted in the European Union.",
        ],
      },
      {
        heading: "Notification of changes",
        body: [
          "We give at least 30 days' notice before adding a new subprocessor that handles Customer Data. Subscribe to our security notices to receive the announcement, or check this page — the date at the top reflects the most recent change.",
        ],
      },
      {
        heading: "Objections",
        body: [
          `If you object to a new subprocessor, write to ${SITE.email} within 30 days of the announcement. We will work with you to find an accommodation; if we cannot, you may terminate the affected service under your order form's subprocessor-objection clause.`,
        ],
      },
    ],
  },

  "responsible-ai": {
    slug: "responsible-ai",
    title: "Responsible AI",
    eyebrow: "Legal · Responsible AI",
    lede: `The stance we hold on how we build, evaluate, and deploy AI systems for the clients we work with.`,
    sections: [
      {
        heading: "Our position",
        body: [
          "AI is infrastructure that ships to real users, so it inherits the same duty of care as the rest of the stack. We treat safety, evaluation, transparency, and human oversight as engineering requirements, not marketing claims — measured, versioned, and reviewed the same way we review any other production system.",
        ],
      },
      {
        heading: "Client data is not training data",
        body: [
          "We do not use client data — prompts, completions, uploads, retrieval sources, evaluation traces, or telemetry — to train, fine-tune, or evaluate any foundation model, ours or a third party's, unless you have signed a specific written agreement authorising a named use. The default is off, and there is no path in our stack that flips it on silently.",
        ],
      },
      {
        heading: "Model choice and provenance",
        body: [
          "We select models on capability, cost, latency, and vendor safety posture — not on brand. For every deployed model we record its provider, version, licence, known limitations, and the evaluation suite it passed before going live. Model swaps are versioned and change-logged so a regression can be traced to the exact release.",
        ],
      },
      {
        heading: "Evaluation and guardrails",
        body: [
          "Every production endpoint has an evaluation suite covering task quality, factuality where the domain allows it, refusal behaviour on out-of-scope requests, and safety on the categories relevant to the deployment. Guardrails run inline: input classification, output filtering, and policy-aware routing. Failures roll back the release, they do not just alert.",
        ],
      },
      {
        heading: "Human oversight",
        body: [
          "Automated decisions with legal or similarly significant effect on a person — credit, housing, employment, insurance, benefits, medical triage — require a documented human review step and an appropriate legal basis. This is enforced in our engagement contracts, not just in our documentation.",
        ],
      },
      {
        heading: "Transparency to end users",
        body: [
          "Where an interaction is with an AI system on your product, users should be told. We help you meet that obligation in the product design and in the model cards we hand over; the wording and placement is a decision you own, but the default position we take into design reviews is disclose.",
        ],
      },
      {
        heading: "Bias, harm, and known limits",
        body: [
          "No frontier model is bias-free, and no evaluation suite is exhaustive. We publish the limitations we know about for each deployment — the populations it under-represents, the categories where refusal is stricter, the failure modes we have measured — so your team can add product-side mitigations rather than discovering them in the field.",
        ],
      },
      {
        heading: "Incident response",
        body: [
          "A safety incident is any output that causes real-world harm, plausibly could, or breaches the safety commitments in this policy on our side. We roll back or gate the offending work, notify the affected client on the same clock as any security incident, and publish a post-incident review to the engagement.",
        ],
      },
      {
        heading: "Reporting a concern",
        body: [
          `Email ${SITE.supportEmail} with the subject line "Responsible AI" and enough detail for us to reproduce or verify. Concerns from end users of a client's product should route through that client first; where they reach us directly we relay them to the client and, if the concern involves risk to a person, act on it immediately regardless of relay.`,
        ],
      },
    ],
  },
};

export const LEGAL_SLUGS = Object.keys(LEGAL_DOCS) as LegalDoc["slug"][];
