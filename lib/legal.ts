import { SITE } from "./content";

/**
 * Legal copy. This is a reasonable starting draft for a services company —
 * have counsel review it before launch, and update LAST_UPDATED when you do.
 */

export const LAST_UPDATED = "22 July 2026";

export type LegalSection = { heading: string; body: string[] };

export type LegalDoc = {
  slug: "privacy" | "terms" | "security";
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
          "Form submissions are delivered by our email provider and stored in our company mailbox. Our hosting provider processes standard server logs. We use no other third-party processors for the data collected on this site.",
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
};

export const LEGAL_SLUGS = Object.keys(LEGAL_DOCS) as LegalDoc["slug"][];
