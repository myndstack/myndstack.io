import Link from "next/link";

import { DIVE_STATEMENT, LANDING_HEADLINE, STUDIO_COORDS } from "@/lib/landing/chapters";

import CopyEmail from "../core/CopyEmail";
import IstClock from "../core/IstClock";
import { blockStyle } from "../engine/plan";
import { FacePoster } from "../engine/Posters";
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
 * §01 — the hero, then the dive: the first two RUN blocks. The copy holds
 * columns 1–6; the engine is the stage's (pinned) or this block's own slot
 * (the static layout: beside the copy on wide screens, a horizon on phones).
 * The intro — the ring drawing itself, the headline decoding, the copy
 * rising — plays once.
 */
export default function Hero({ eyebrow, subhead, ctaPrimary, ctaSecondary, email, version }: Props) {
  return (
    <>
      <MotionChapter id="core-hero" kind="once" eager className="hero-run">
        <header id="top" data-surface="ink" className="hero" style={blockStyle("hero")}>
          <div className="hero-grid" aria-hidden="true" />
          <div className="page-col ms-grid hero-inner">
            <div className="ms-copy ms-copy--wide hero-copy" data-beat-marker="hero">
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
          </div>

          {/* The static layout's Core: the right half on wide screens, a horizon
              at the foot on phones. Outside the content layer, under the copy. */}
          <div className="engine-slot engine-slot--hero" aria-hidden="true">
            <FacePoster id="slot-hero" prefix="slot-hero" />
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
      </MotionChapter>

      <div data-surface="ink" className="dive ms-block" style={blockStyle("dive")}>
        <div className="page-col ms-grid">
          <p className="ms-copy dive-statement" data-beat-marker="dive">
            {DIVE_STATEMENT}
          </p>
        </div>
      </div>
    </>
  );
}
