import Capabilities from "@/components/Capabilities";
import ContactForm from "@/components/ContactForm";
import Contrast from "@/components/Contrast";
import CtaBand from "@/components/CtaBand";
import Faq from "@/components/Faq";
import Hero from "@/components/Hero";
import Integrations from "@/components/Integrations";
import Manifesto from "@/components/Manifesto";
import MarqueeBand from "@/components/MarqueeBand";
import Pricing from "@/components/Pricing";
import Process from "@/components/Process";
import SectionIndexRail from "@/components/SectionIndexRail";
import SelectedWork from "@/components/SelectedWork";
import StackStory from "@/components/StackStory";
import Team from "@/components/Team";
import { getFaqs, getHomepage, getPricingTiers, getSiteSettings } from "@/lib/sanity/queries";
import { jsonLd } from "@/lib/format";

export default async function Home() {
  // The client sections (Hero, Manifesto, Faq, Pricing, ContactForm) can't fetch,
  // so this server component fetches once and passes their data down.
  // getHomepage/getSiteSettings are cached, so the server sections that self-fetch
  // them below share this same request. The awaits run in parallel.
  const [home, faqs, tiers, site] = await Promise.all([
    getHomepage(),
    getFaqs(),
    getPricingTiers(),
    getSiteSettings(),
  ]);

  return (
    <>
      {/* FAQPage markup so the questions can surface as rich results in search. */}
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
      {/* No markup — lights the current section's ordinal in the index rail off
          the shared scroll loop. Homepage-only, where the SectionHeaders live. */}
      <SectionIndexRail />
      <Hero
        eyebrow={home.hero.eyebrow}
        subhead={home.hero.subhead}
        ctaPrimary={home.hero.ctaPrimary}
        ctaSecondary={home.hero.ctaSecondary}
      />
      {/* Problem framing before the solution — name the pain (glue nobody owns)
          before the stack that removes it assembles. */}
      <Contrast />
      <StackStory />
      <Capabilities />
      <Integrations />
      <SelectedWork />
      <Process />
      <Pricing tiers={tiers} />
      <Team />
      {/* Brand crescendo just before the close. */}
      <Manifesto lead={home.manifestoLead} keep={home.manifestoKeep} />
      <Faq faqs={faqs} />
      {/* Brand wordline as a texture beat leading into the final CTA. */}
      <MarqueeBand />
      <CtaBand />
      <ContactForm
        email={site.email}
        phone={site.phone}
        phoneHref={site.phoneHref}
        location={site.location}
        turnstileSiteKey={process.env.TURNSTILE_SITE_KEY ?? ""}
      />
    </>
  );
}
