import Link from "next/link";

import { DIVE_STATEMENT, LANDING_HEADLINE, STUDIO_COORDS } from "@/lib/landing/chapters";

import CopyEmail from "../core/CopyEmail";
import CoreStage from "../core/CoreStage";
import IstClock from "../core/IstClock";
import MagneticSpring from "../motion/MagneticSpring";
import MotionChapter from "../motion/MotionChapter";

type Props = {
  readonly eyebrow: string;
  readonly subhead: string;
  readonly ctaPrimary: string;
  readonly ctaSecondary: string;
  readonly email: string;
  readonly version: string;
};

/**
 * Run A: the hero and the dive, over one pinned Core stage.
 *
 * The flow layer holds every word and link; the stage behind it is decoration
 * (aria-hidden, inert). On the pinned layout the dive segment is two screens
 * of scroll in which the Core tilts back and sinks while the paper Platform
 * rises over it like a curtain. On phones and short screens nothing pins: the
 * Core is the hero's horizon and the dive is just its statement line.
 */
export default function Hero({ eyebrow, subhead, ctaPrimary, ctaSecondary, email, version }: Props) {
  return (
    <MotionChapter id="core-hero" kind="scrub" eager className="core-run core-run--hero">
      <CoreStage prefix="hero" placement="hero" />

      <div className="core-flow">
        <header id="top" data-segment="hero" className="hero">
          <div className="hero-grid" aria-hidden="true" />
          <div className="page-col hero-inner">
            <p className="hero-eyebrow" data-rise>
              <span className="stamp">§01</span>
              <span>{eyebrow}</span>
            </p>

            <h1 className="hero-h1">
              <span className="hero-line">
                <span className="hero-real">{LANDING_HEADLINE.lead}</span>
                <span className="hero-decode" aria-hidden="true" data-decode={LANDING_HEADLINE.lead} />
              </span>
              <span className="hero-line hero-line--accent">
                <span className="hero-real">{LANDING_HEADLINE.accent}</span>
                <span className="hero-decode" aria-hidden="true" data-decode={LANDING_HEADLINE.accent} />
              </span>
            </h1>

            <p className="hero-lede" data-rise>
              {subhead}
            </p>

            <div className="hero-ctas" data-rise>
              <MagneticSpring>
                <a href="#contact" className="btn btn-lime">
                  {ctaPrimary}
                </a>
              </MagneticSpring>
              <Link href="/work" className="btn btn-outline">
                {ctaSecondary}
              </Link>
            </div>

            <div data-rise>
              <CopyEmail email={email} />
            </div>
          </div>

          <div className="hud hud--hero" aria-hidden="true" data-rise>
            <span>
              <span className="hud-k">LOC</span> {STUDIO_COORDS}
            </span>
            <span>
              <span className="hud-k">IST</span> <IstClock />
            </span>
            <span className="hud-build">
              <span className="hud-k">BUILD</span> {version}
            </span>
          </div>
        </header>

        <div data-segment="dive" className="dive">
          <p className="dive-statement">{DIVE_STATEMENT}</p>
        </div>
      </div>
    </MotionChapter>
  );
}
