import CoreRing, { CoreGlow } from "./CoreRing";

type Props = {
  /** Unique per stage on the page (SVG ids). */
  readonly prefix: string;
  /** Positions the Core inside the stage (landing.css `.core-scene--*`). */
  readonly placement: "hero" | "center";
  readonly className?: string;
};

/**
 * The pinned, decorative layer of a Core run: a light wash, then the Core in a
 * 3D scene — `[data-core-3d]` takes the scrubbed camera move, `[data-core-lean]`
 * the pointer lean, so no two animations ever share an element and property.
 * `[data-core-field]` is where the motion builder mounts the particle canvas.
 *
 * aria-hidden + inert, with nothing focusable inside: every word and link of a
 * run lives in the flow layer above it (an e2e test enforces this).
 */
export default function CoreStage({ prefix, placement, className }: Props) {
  return (
    <div data-stage aria-hidden="true" inert className={`core-stage${className ? ` ${className}` : ""}`}>
      <div className="core-wash" data-core-wash />
      <div className={`core-scene core-scene--${placement}`}>
        <div className="core-3d" data-core-3d>
          <div className="core-lean" data-core-lean>
            <CoreGlow />
            <div className="core-field" data-core-field />
            <CoreRing prefix={prefix} />
          </div>
        </div>
      </div>
    </div>
  );
}
