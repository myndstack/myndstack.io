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

export default function Home() {
  return (
    <>
      <Hero />
      <MarqueeBand />
      <StackStory />
      <Capabilities />
      <SelectedWork />
      <Process />
      <LogoMarquee />
      <StatsStrip />
      <Contrast />
      <Manifesto />
      <Testimonials />
      <Pricing />
      <Team />
      <Careers />
      <Faq />
      <CtaBand />
      <ContactForm />
    </>
  );
}
