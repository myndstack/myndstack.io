import { CLOSING } from "@/lib/landing/chapters";

import MagneticSpring from "../motion/MagneticSpring";
import { Beat, Scene, Slot } from "../scene/Scene";
import { Kicker, Lede, Rise, Title } from "../type/Type";

/**
 * The closing: the FAQ sheet scrolls away and uncovers the ring on paper,
 * powered off on its floor; the scroll powers it on — ticks, arcs, core,
 * waveform — and at ignition the page develops to metal from the core. The
 * words wait for it, centred beneath the ring. Contact slides over.
 */
export default function Closing({ cta }: { readonly cta: string }) {
  return (
    <Scene id="closing" anchor="cta" labelledBy="cta-title">
      <Beat id="closing" className="closing">
        <div className="closing-copy">
          <Kicker>{CLOSING.kicker}</Kicker>
          <Title id="cta-title" size="xl" lines={[CLOSING.title]} />
          <Lede>{CLOSING.line}</Lede>
          <Rise i={1} className="closing-ctas">
            <MagneticSpring>
              <a href="#contact" className="btn btn-lime">
                {cta}
              </a>
            </MagneticSpring>
            <a href="#pricing" className="btn btn-outline">
              See pricing
            </a>
          </Rise>
        </div>
        <Slot beat="closing" />
      </Beat>
    </Scene>
  );
}
