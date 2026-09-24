import "./styles/skins.css";
import "./styles/frame.css";
import "./styles/scenes.css";
import "./styles/stage.css";
import "./styles/core.css";
import "./styles/components.css";
import "./styles/artifacts.css";
import "./styles/layer-cards.css";
import "./styles/intro.css";
import "./styles/stack.css";
import "./styles/caps.css";
import "./styles/work.css";
import "./styles/process.css";
import "./styles/tools.css";
import "./styles/studio.css";
import "./styles/closing.css";
import "./styles/sheets.css";
import "./styles/chrome.css";

import { jsonLd } from "@/lib/format";
import type { CaseStudy } from "@/lib/cases";
import type { PricingTier } from "@/lib/content";
import type { Faq as FaqItem, Homepage, SiteSettings, TeamMember } from "@/lib/sanity/queries";

import Capabilities from "./chapters/Capabilities";
import Cases from "./chapters/Cases";
import Closing from "./chapters/Closing";
import ContactChapter from "./chapters/ContactChapter";
import Founder from "./chapters/Founder";
import Hero from "./chapters/Hero";
import LandingFaq from "./chapters/LandingFaq";
import Platform from "./chapters/Platform";
import PricingChapter from "./chapters/PricingChapter";
import Process from "./chapters/Process";
import Tools from "./chapters/Tools";
import Frame from "./chrome/Frame";
import TitleBlock from "./chrome/TitleBlock";
import ZoneRuler from "./chrome/ZoneRuler";
import Engine from "./engine/Engine";
import EngineStage from "./engine/EngineStage";
import { RingSprite } from "./core/CoreRing";
import StageOverlay from "./engine/StageOverlay";
import MobileCtaBar from "./MobileCtaBar";

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
 * The landing — one instrument, one sheet. A page-wide sticky stage (the
 * skins and the engine) runs behind every scene; each scene is a spacer
 * holding one sticky panel of words (lib/landing/engine/scenes.ts derives
 * their lengths from the beat table); the pricing, FAQ and contact sheets
 * flow over the stage. The director (Engine) and its live half only write
 * data attributes and a few custom properties onto this markup.
 *
 * Every chapter renders its finished markup on the server: no JS, reduced
 * motion, phones, short screens and print get the static page — each beat
 * on its own skin with its own poster. The live homepage's pricing, FAQ data
 * and contact form are reused as-is, so every anchor, form and checkout link
 * works throughout.
 */
export default function LandingPage({ home, faqs, cases, team, tiers, site, turnstileSiteKey }: Props) {
  const featured = cases.find((c) => c.featured) ?? cases[0];
  // Sanity keeps "Adding soon" rows as slots for future hires; they aren't people.
  const people = team.filter((member) => member.n !== "Adding soon");
  return (
    <div className="landing" data-skin="machined" data-accent="lime">
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
      <RingSprite />
      <div className="landing-grain" aria-hidden="true" />
      <Frame />
      <ZoneRuler />
      <TitleBlock version={site.version} />
      <MobileCtaBar label={home.hero.ctaPrimary} note={home.hero.eyebrow} />
      <Engine />
      <StageOverlay />

      <div className="run">
        <EngineStage />
        <div className="flow">
          <Hero
            eyebrow={home.hero.eyebrow}
            subhead={home.hero.subhead}
            ctaPrimary={home.hero.ctaPrimary}
            ctaSecondary={home.hero.ctaSecondary}
            email={site.email}
          />
          <Platform />
          <Capabilities capabilities={home.capabilities} cta={home.hero.ctaPrimary} />
          {featured ? <Cases study={featured} total={cases.length} /> : null}
          <Process steps={home.steps} />
          <Tools />
          <Founder people={people} site={site} contrastWith={home.contrastWith} contrastWithout={home.contrastWithout} />
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
      </div>
    </div>
  );
}
