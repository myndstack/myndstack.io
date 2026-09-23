import SectionIndexRail from "@/components/SectionIndexRail";
import { jsonLd } from "@/lib/format";
import { LANDING_PLACEHOLDERS } from "@/lib/landing/content";
import type { Faq, Homepage } from "@/lib/sanity/queries";
import type { CaseStudy } from "@/lib/cases";

import Placeholder from "./blueprint/Placeholder";
import CaseStrip from "./sections/CaseStrip";
import Hero from "./sections/Hero";
import Pipeline from "./sections/Pipeline";
import Stack from "./sections/Stack";

type Props = {
  readonly home: Homepage;
  readonly faqs: readonly Faq[];
  readonly cases: readonly CaseStudy[];
};

/**
 * The "Blueprint → Build" landing, in section order. Built chapters render
 * their finished markup on the server; not-yet-built sections are labelled
 * placeholders carrying their final ids (nav, anchors and scroll-spy work
 * already). `.landing` scopes the blueprint draft CSS to this page.
 */
export default function LandingPage({ home, faqs, cases }: Props) {
  const featured = cases.find((c) => c.featured) ?? cases[0];
  const ph = LANDING_PLACEHOLDERS;

  return (
    <div className="landing">
      {/* FAQPage markup, carried over from "/" so the swap loses nothing. */}
      {faqs.length ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqs.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            }),
          }}
        />
      ) : null}
      <SectionIndexRail />

      <Hero
        eyebrow={home.hero.eyebrow}
        subhead={home.hero.subhead}
        ctaPrimary={home.hero.ctaPrimary}
        ctaSecondary={home.hero.ctaSecondary}
      />
      <Placeholder id="contrast" {...ph.contrast} />
      <Stack />
      {featured ? <Pipeline study={featured} /> : null}
      {cases.length ? <CaseStrip cases={cases} /> : null}
      <Placeholder id="capabilities" {...ph.capabilities} />
      <Placeholder id="pricing" {...ph.pricing} />
      <Placeholder id="process" {...ph.process} />
      <Placeholder id="team" {...ph.team} />
      <Placeholder id="demo" {...ph.demo} />
      <Placeholder id="faq" {...ph.faq} />
      <Placeholder id="cta" {...ph.cta} />
      <Placeholder id="contact" {...ph.contact} />
    </div>
  );
}
