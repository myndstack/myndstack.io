import Capabilities from "@/components/Capabilities";
import Careers from "@/components/Careers";
import ContactForm from "@/components/ContactForm";
import Contrast from "@/components/Contrast";
import CtaBand from "@/components/CtaBand";
import Faq from "@/components/Faq";
import Hero from "@/components/Hero";
import Integrations from "@/components/Integrations";
import LogoMarquee from "@/components/LogoMarquee";
import Manifesto from "@/components/Manifesto";
import MarqueeBand from "@/components/MarqueeBand";
import Pricing from "@/components/Pricing";
import Process from "@/components/Process";
import SelectedWork from "@/components/SelectedWork";
import StackStory from "@/components/StackStory";
import StatsStrip from "@/components/StatsStrip";
import Team from "@/components/Team";
import Testimonials from "@/components/Testimonials";
import {
  getFaqs,
  getHomepage,
  getPricingTiers,
  getSiteSettings,
  getTestimonials,
} from "@/lib/sanity/queries";
import { jsonLd } from "@/lib/format";

export default async function Home() {
  // The client sections (Hero, Manifesto, Faq, Pricing, Testimonials, ContactForm)
  // can't fetch, so this server component fetches once and passes their data down.
  // getHomepage/getSiteSettings are cached, so the server sections that self-fetch
  // them below share this same request. The awaits run in parallel.
  const [home, faqs, tiers, testimonials, site] = await Promise.all([
    getHomepage(),
    getFaqs(),
    getPricingTiers(),
    getTestimonials(),
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
      <Hero
        eyebrow={home.hero.eyebrow}
        subhead={home.hero.subhead}
        ctaPrimary={home.hero.ctaPrimary}
        ctaSecondary={home.hero.ctaSecondary}
      />
      {/* Client lockups ride high, right under the hero: the first thing after
          the pitch is proof of who already trusts the stack. */}
      <LogoMarquee />
      {/* Problem framing before the solution — name the pain (glue nobody owns)
          before the stack that removes it assembles. */}
      <Contrast />
      <StackStory />
      <Capabilities />
      <Integrations />
      {/* Proof: the work, then the numbers behind it. */}
      <SelectedWork />
      <StatsStrip />
      <Process />
      <Testimonials items={testimonials} />
      <Pricing tiers={tiers} />
      <Team />
      <Careers />
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
      />
    </>
  );
}
