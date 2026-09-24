import { DRAW_POSTERS } from "@/lib/landing/engine/posters";

import CapDemos from "../core/CapDemos";
import DocsFan from "../core/DocsFan";
import ShipConsole from "../core/ShipConsole";
import { DrawingPoster, FacePoster } from "./Posters";

/** One skin's sheet: its base and atmosphere, and every poster in that skin's tone. */
function Sheet({ sheet, skin }: { readonly sheet: "a" | "b"; readonly skin: string }) {
  return (
    <div className="stage-sheet" data-sheet={sheet} data-skin={skin}>
      <div className="stage-atmos" />
      <div className="stage-halo" />
      <div className="stage-posters">
        <FacePoster id="face" prefix={`stage-${sheet}`} />
        {DRAW_POSTERS.map((p) => (
          <DrawingPoster key={p.id} id={p.id} />
        ))}
      </div>
    </div>
  );
}

/**
 * The stage: sticky and page-wide, behind every scene (layer 1). It owns the
 * background — two skin sheets, the second clipped at the current front by
 * the director — and the engine: posters in each sheet's tone until the live
 * canvas has drawn, the SIGNAL chamber in the bore (the hero's terminal, the
 * capabilities' demos), the document fan and the front itself. Decoration only: aria-hidden and inert; every word is in the
 * scenes beside it.
 */
export default function EngineStage() {
  return (
    <div className="stage" data-engine-stage aria-hidden="true" inert data-accent="lime">
      <Sheet sheet="a" skin="machined" />
      <Sheet sheet="b" skin="drafting" />
      <div className="stage-chamber" data-skin="signal">
        <div className="chamber-grid" />
        <CapDemos />
        <ShipConsole />
      </div>
      <canvas className="stage-canvas" />
      <div className="stage-overlays">
        <DocsFan className="stage-docs" />
      </div>
      <div className="stage-front">
        <i className="front-line" />
        <i className="front-head" />
        <i className="front-ring" />
      </div>
    </div>
  );
}
