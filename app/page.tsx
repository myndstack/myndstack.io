import Aurora from "@/components/Aurora";
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
      <MarqueeBand />
      {/* Logos land immediately after the hero band so the first thing after
          the value prop is external credibility, matching the pattern used by
          Vercel, Stripe, Anthropic and most B2B infra sites. Sits outside the
          aurora wrapper so it renders on plain ink, no z-index acrobatics. */}
      <LogoMarquee />
      {/* One soft aurora is the continuous base behind the whole stack → Studio
          (Team) run — a single flowing gradient, no grid, no dots. The grid +
          travelling-signals field is kept for the StackStory moment only (inside
          its own sticky element, see StackStory.tsx); every other section in the
          run floats on the aurora alone, so the content leads and the motion
          stays calm. The wrapper is `relative isolate` but NOT `overflow-hidden`:
          StackStory pins with `position: sticky`, which an overflow-clip ancestor
          would break; the aurora sits behind at a negative z-index. Everything
          after Team stays on plain ink. */}
      <div className="relative isolate">
        <Aurora />
        <StackStory />
        <Capabilities />
        <Integrations />
        <SelectedWork />
        <Process />
        <StatsStrip />
        <Contrast />
        <Manifesto lead={home.manifestoLead} keep={home.manifestoKeep} />
        <Testimonials items={testimonials} />
        <Pricing tiers={tiers} />
        <Team />
      </div>
      <Careers />
      <Faq faqs={faqs} />
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
