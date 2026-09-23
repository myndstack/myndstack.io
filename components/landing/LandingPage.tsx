import "./styles/base.css";
import "./styles/core.css";
import "./styles/hero.css";
import "./styles/platform.css";
import "./styles/capabilities.css";
import "./styles/cases.css";
import "./styles/process.css";
import "./styles/tools.css";
import "./styles/studio.css";
import "./styles/closing.css";
import "./styles/hud.css";

import { jsonLd } from "@/lib/format";
import type { CaseStudy } from "@/lib/cases";
import type { PricingTier } from "@/lib/content";
import type { Faq as FaqItem, Homepage, SiteSettings, TeamMember } from "@/lib/sanity/queries";

import Hero from "./chapters/Hero";
import Capabilities from "./chapters/Capabilities";
import Cases from "./chapters/Cases";
import Closing from "./chapters/Closing";
import ContactChapter from "./chapters/ContactChapter";
import Founder from "./chapters/Founder";
import LandingFaq from "./chapters/LandingFaq";
import Platform from "./chapters/Platform";
import PricingChapter from "./chapters/PricingChapter";
import Process from "./chapters/Process";
import Tools from "./chapters/Tools";
import MobileCtaBar from "./MobileCtaBar";
import ScrollRuler from "./ScrollRuler";

type Props = {
  readonly home: Homepage;
  readonly faqs: readonly FaqItem[];
  readonly cases: readonly CaseStudy[];
  readonly team: readonly TeamMember[];
  readonly tiers: PricingTier[];
  readonly site: SiteSettings;
  readonly turnstileSiteKey: string;
};

/**
 * The "Full Spectrum" landing, in section order. Every chapter renders its
 * finished markup on the server; motion is layered on by MotionChapter
 * islands. Sections not yet rebuilt reuse the live homepage's components (so
 * every anchor, form and checkout link works throughout the build).
 */
export default function LandingPage({ home, faqs, cases, team, tiers, site, turnstileSiteKey }: Props) {
  const featured = cases.find((c) => c.featured) ?? cases[0];
  // Sanity keeps "Adding soon" rows as slots for future hires; they aren't people.
  const people = team.filter((member) => member.n !== "Adding soon");
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
      <div className="landing-grain" aria-hidden="true" />
      <ScrollRuler />
      <MobileCtaBar label={home.hero.ctaPrimary} note={home.hero.eyebrow} />

      <Hero
        eyebrow={home.hero.eyebrow}
        subhead={home.hero.subhead}
        ctaPrimary={home.hero.ctaPrimary}
        ctaSecondary={home.hero.ctaSecondary}
        email={site.email}
        version={site.version}
      />

      <Platform />
      <Capabilities capabilities={home.capabilities} cta={home.hero.ctaPrimary} />
      {featured ? <Cases study={featured} total={cases.length} /> : null}
      <Process steps={home.steps} />
      <Tools />
      <Founder
        people={people}
        site={site}
        contrastWith={home.contrastWith}
        contrastWithout={home.contrastWithout}
      />
      <PricingChapter tiers={tiers} />
      {/* Scroll-spy tail sentinel (SPY_IDS): past pricing, no nav link stays lit. */}
      <div id="demo" aria-hidden="true" />
      <LandingFaq faqs={faqs} />
      <Closing cta={home.hero.ctaPrimary} />
      <ContactChapter
        email={site.email}
        phone={site.phone}
        phoneHref={site.phoneHref}
        location={site.location}
        turnstileSiteKey={turnstileSiteKey}
      />
    </div>
  );
}
