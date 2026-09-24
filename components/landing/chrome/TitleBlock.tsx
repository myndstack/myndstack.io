import { STUDIO_COORDS } from "@/lib/landing/chapters";

import IstClock from "../core/IstClock";
import MotionToggle from "./MotionToggle";

/**
 * The title block, bottom-left (pinned layout): which section you're on and a
 * live status line for the stage (the director writes both, on change), the
 * studio's own readout on the hero (location, local time, build), and two
 * controls — pause every loop (WCAG 2.2.2) and the text view (the static,
 * fully built page).
 */
export default function TitleBlock({ version }: { readonly version: string }) {
  return (
    <div className="title-block" data-skin="machined" data-beat="hero">
      <p className="tb-sheet">
        <span className="tb-k">§</span> <b data-tb-sheet>01/10</b> <span className="tb-dash">·</span> <b data-tb-name>Intro</b>
      </p>
      <p className="tb-read">
        <span data-tb-hero>
          <span className="tb-k">Loc</span> {STUDIO_COORDS} · <span className="tb-k">IST</span> <IstClock /> ·{" "}
          <span className="tb-k">Build</span> {version}
        </span>
        <span data-tb-read />
      </p>
      <p className="tb-actions">
        <MotionToggle />
        <a href="?motion=off" className="tb-link">
          Text view
        </a>
      </p>
    </div>
  );
}
