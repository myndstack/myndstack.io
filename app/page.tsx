import Aurora from "@/components/Aurora";
import Capabilities from "@/components/Capabilities";
import Careers from "@/components/Careers";
import ContactForm from "@/components/ContactForm";
import Contrast from "@/components/Contrast";
import CtaBand from "@/components/CtaBand";
import Faq from "@/components/Faq";
import FieldBand from "@/components/FieldBand";
import Hero from "@/components/Hero";
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
      {/* Two layers over the stack → Studio(Team) run. The soft aurora is the
          continuous base behind everything (a single flowing gradient, no grid).
          On top of it, the Hybrid A+B field (grid + glow + travelling signals)
          rides the OPEN sections — StackStory, Capabilities, SelectedWork,
          Manifesto, Testimonials — while the paneled sections between them
          (Process, StatsStrip, Contrast, Pricing, Team) show the aurora alone,
          giving the on/off rhythm. The wrapper is `relative isolate` but NOT
          `overflow-hidden`: StackStory pins with `position: sticky`, which an
          overflow-clip ancestor would break; the aurora sits behind at a negative
          z-index. StackStory carries its field inside its own sticky element for
          the same pin reason (see StackStory.tsx). Everything after Team stays on
          plain ink. */}
      <div className="relative isolate">
        <Aurora />
        <StackStory />
        <FieldBand signals variant={1}>
          <Capabilities />
        </FieldBand>
        <FieldBand variant={2}>
          <SelectedWork />
        </FieldBand>
        <Process />
        <LogoMarquee />
        <StatsStrip />
        <Contrast />
        <FieldBand variant={3}>
          <Manifesto lead={home.manifestoLead} keep={home.manifestoKeep} />
        </FieldBand>
        <FieldBand signals variant={2}>
          <Testimonials items={testimonials} />
        </FieldBand>
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
