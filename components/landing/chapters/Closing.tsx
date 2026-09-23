import { CLOSING } from "@/lib/landing/chapters";

import CoreRingMini from "../core/CoreRingMini";
import MagneticSpring from "../motion/MagneticSpring";
import MotionChapter from "../motion/MotionChapter";

type Props = {
  readonly cta: string;
};

/**
 * The closing band: the Core returns as a horizon, every arc lit, under the
 * restated promise. Its slow pulse is a CSS loop that only runs on screen.
 */
export default function Closing({ cta }: Props) {
  return (
    <section id="cta" className="closing" aria-labelledby="cta-title">
      <MotionChapter id="cta" kind="once" className="closing-run">
        <div className="closing-horizon" aria-hidden="true">
          <CoreRingMini className="closing-ring" />
          <span className="closing-glow" />
        </div>
        <div className="page-col closing-inner">
          <p className="chapter-kicker">{CLOSING.kicker}</p>
          <h2 id="cta-title" className="closing-title">
            {CLOSING.title}
          </h2>
          <p className="closing-line">{CLOSING.line}</p>
          <div className="closing-ctas">
            <MagneticSpring>
              <a href="#contact" className="btn btn-lime">
                {cta}
              </a>
            </MagneticSpring>
            <a href="#pricing" className="btn btn-outline">
              See pricing
            </a>
          </div>
        </div>
      </MotionChapter>
    </section>
  );
}
