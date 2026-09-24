import Link from "next/link";

import { DIVE_STATEMENT, LANDING_HEADLINE } from "@/lib/landing/chapters";

import CopyEmail from "../core/CopyEmail";
import MagneticSpring from "../motion/MagneticSpring";
import { Beat, Scene, Slot } from "../scene/Scene";
import { Kicker, Lede, Rise, Title } from "../type/Type";

type Props = {
  readonly eyebrow: string;
  readonly subhead: string;
  readonly ctaPrimary: string;
  readonly ctaSecondary: string;
  readonly email: string;
};

/**
 * §01 — the intro scene: the hero (copy in columns 1–5, the Core on the
 * right), then the dive — the engine tilts and opens while one statement
 * holds bottom-left, and the scan rises through both, turning them to ink.
 * The statement has an ink twin (aria-hidden) clipped at the scan's line.
 */
export default function Hero({ eyebrow, subhead, ctaPrimary, ctaSecondary, email }: Props) {
  return (
    <Scene id="intro" anchor="top" labelledBy="hero-title">
      <Beat id="hero">
        <div className="hero-copy">
          <Kicker n="§01">{eyebrow}</Kicker>
          <Title as="h1" size="xl" id="hero-title" lines={[{ text: LANDING_HEADLINE.lead, tone: "setup" }, LANDING_HEADLINE.accent]} />
          <Lede i={0}>{subhead}</Lede>
          <Rise i={1} className="hero-ctas">
            <MagneticSpring>
              <a href="#contact" className="btn btn-lime">
                {ctaPrimary}
              </a>
            </MagneticSpring>
            <Link href="/work" className="btn btn-outline">
              {ctaSecondary}
            </Link>
          </Rise>
          <Rise i={2} className="hero-email">
            <CopyEmail email={email} />
          </Rise>
        </div>
        <Slot beat="hero" className="slot--hero" />
      </Beat>

      <Beat id="dive" className="dive has-twin">
        <Title as="p" lines={[DIVE_STATEMENT]} className="dive-statement" />
        <Slot beat="dive" />
      </Beat>
      {/* The statement in ink, revealed below the scan's line. */}
      <Beat id="dive" className="dive dive--ink" twin="drafting">
        <Title as="p" lines={[DIVE_STATEMENT]} className="dive-statement" />
      </Beat>
    </Scene>
  );
}
