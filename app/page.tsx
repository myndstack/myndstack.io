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
      <Hero
        eyebrow={home.hero.eyebrow}
        subhead={home.hero.subhead}
        ctaPrimary={home.hero.ctaPrimary}
        ctaSecondary={home.hero.ctaSecondary}
      />
      <MarqueeBand />
      <StackStory />
      {/* The animated blueprint field rides the "open" sections — the ones whose
          content sits on ink rather than an opaque panel. Signals (the canvas)
          run only on the two focal bands and are spaced apart, so at most one is
          ever in view; the rest are static CSS grid + glow. `variant` shifts the
          glows so repeats don't look identical. The paneled sections between them
          (Process, StatsStrip, Contrast, Pricing, Team, Careers) stay clean,
          which is what gives the alternating rhythm. */}
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
      <Careers />
      <FieldBand variant={1}>
        <Faq faqs={faqs} />
      </FieldBand>
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
