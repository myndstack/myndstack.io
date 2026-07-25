import Aurora from "@/components/Aurora";
import Capabilities from "@/components/Capabilities";
import Careers from "@/components/Careers";
import ContactForm from "@/components/ContactForm";
import Contrast from "@/components/Contrast";
import CtaBand from "@/components/CtaBand";
import Faq from "@/components/Faq";
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
      {/* One continuous soft aurora runs behind everything from the stack down to
          the Studio (Team) section — a single flowing gradient, no grid, no dots.
          The wrapper is `relative isolate` but deliberately NOT `overflow-hidden`:
          StackStory pins with `position: sticky`, which an overflow-clip ancestor
          would break. The aurora sits at a negative z-index behind all the
          sections' content and clips its own blobs. Everything after Team
          (Careers, FAQ, CTA, contact) stays on plain ink. */}
      <div className="relative isolate">
        <Aurora />
        <StackStory />
        <Capabilities />
        <SelectedWork />
        <Process />
        <LogoMarquee />
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
