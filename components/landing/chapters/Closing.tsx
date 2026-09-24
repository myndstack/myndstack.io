import { CLOSING } from "@/lib/landing/chapters";

import { FacePoster } from "../engine/Posters";
import MagneticSpring from "../motion/MagneticSpring";
import MotionChapter from "../motion/MotionChapter";

type Props = {
  readonly cta: string;
};

/**
 * The closing band: the engine's last dock, centred at the top of the screen,
 * powered on as the band arrives (live; its poster is the finished ring), over
 * the restated promise. Its slow pulse is a CSS loop that only runs on screen.
 */
export default function Closing({ cta }: Props) {
  return (
    <section id="cta" className="closing" data-surface="ink" aria-labelledby="cta-title">
      <MotionChapter id="cta" kind="once" className="page-col closing-run">
        <div
          className="engine-dock engine-dock--closing"
          data-host="dock-closing"
          data-beat-marker="closing"
          aria-hidden="true"
        >
          <FacePoster id="dock-closing" prefix="dock-closing" />
        </div>
        <div className="closing-inner">
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
