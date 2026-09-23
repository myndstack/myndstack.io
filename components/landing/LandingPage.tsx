import "./styles/base.css";
import "./styles/core.css";
import "./styles/hero.css";
import "./styles/platform.css";
import "./styles/capabilities.css";

import ContactForm from "@/components/ContactForm";
import CtaBand from "@/components/CtaBand";
import Faq from "@/components/Faq";
import Integrations from "@/components/Integrations";
import Pricing from "@/components/Pricing";
import Process from "@/components/Process";
import SelectedWork from "@/components/SelectedWork";
import Team from "@/components/Team";
import { jsonLd } from "@/lib/format";
import type { PricingTier } from "@/lib/content";
import type { Faq as FaqItem, Homepage, SiteSettings } from "@/lib/sanity/queries";

import Hero from "./chapters/Hero";
import Capabilities from "./chapters/Capabilities";
import Platform from "./chapters/Platform";

type Props = {
  readonly home: Homepage;
  readonly faqs: readonly FaqItem[];
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
export default function LandingPage({ home, faqs, tiers, site, turnstileSiteKey }: Props) {
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
      <SelectedWork />
      <Process />
      <div id="integrations">
        <Integrations />
      </div>
      <Team />
      <Pricing tiers={tiers} />
      {/* Scroll-spy tail sentinel (SPY_IDS): past pricing, no nav link stays lit. */}
      <div id="demo" aria-hidden="true" />
      <Faq faqs={[...faqs]} />
      <CtaBand />
      <ContactForm
        email={site.email}
        phone={site.phone}
        phoneHref={site.phoneHref}
        location={site.location}
        turnstileSiteKey={turnstileSiteKey}
      />
    </div>
  );
}
