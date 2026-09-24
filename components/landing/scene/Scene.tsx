import type { CSSProperties, ReactNode } from "react";

import { BEATS } from "@/lib/landing/engine/beats";
import { planScenes } from "@/lib/landing/engine/scenes";
import type { Skin } from "@/lib/landing/engine/skins";
import type { SceneId } from "@/lib/landing/engine/types";

import { DrawingPoster, FacePoster } from "../engine/Posters";

const PLANS = planScenes(BEATS);

type SceneProps = {
  readonly id: SceneId;
  /** The section's anchor (nav, ruler). */
  readonly anchor: string;
  /** A second anchor the site's nav links to (lands on the same first hold). */
  readonly alias?: string;
  readonly labelledBy?: string;
  readonly className?: string;
  readonly children: ReactNode;
};

/**
 * A pinned scene: an in-flow spacer (its length and its beats' markers come
 * from planScenes — the page implements the beat table) holding one sticky,
 * transparent panel of words over the stage. Unpinned it is a plain section.
 */
export function Scene({ id, anchor, alias, labelledBy, className, children }: SceneProps) {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan) return null;
  return (
    <section
      id={anchor}
      className={`scene scene--${id}${className ? ` ${className}` : ""}`}
      data-scene={id}
      data-overlap={plan.overlap ? "" : undefined}
      aria-labelledby={labelledBy}
      style={{ "--len": `${plan.length}svh`, "--land": `${plan.land}svh` } as CSSProperties}
    >
      {alias ? <span id={alias} className="scene-alias" aria-hidden="true" /> : null}
      {plan.markers.map((m) => (
        <span key={m.id} className="beat-marker" data-beat-marker={m.id} style={{ "--at": `${m.at}svh` } as CSSProperties} />
      ))}
      <div className="panel">{children}</div>
    </section>
  );
}

type BeatProps = {
  readonly id: string;
  readonly className?: string;
  /**
   * An aria-hidden, inert copy of the group on another skin, revealed below a
   * scan's line (`--line` on the panel): a designated statement converts with
   * the front instead of leaving before it.
   */
  readonly twin?: Skin;
  readonly children: ReactNode;
};

/** One beat's words: a full-panel grid of cells, on its beat's skin and accent. */
export function Beat({ id, className, twin, children }: BeatProps) {
  const beat = BEATS.find((b) => b.id === id);
  return (
    <div
      className={`beat beat--${id}${twin ? " beat--twin" : ""}${className ? ` ${className}` : ""}`}
      data-beat-group={id}
      data-skin={twin ?? beat?.skin}
      data-accent={beat?.accent}
      aria-hidden={twin ? true : undefined}
      inert={twin ? true : undefined}
    >
      {children}
    </div>
  );
}

type FurnitureProps = {
  readonly scene: SceneId;
  readonly skin: Skin;
  /** As Beat's: an aria-hidden copy on another skin, revealed below a scan's line. */
  readonly twin?: Skin;
  readonly className?: string;
  readonly children: ReactNode;
};

/** Furniture that stays through a whole scene (the parts list, the step list). */
export function Furniture({ scene, skin, twin, className, children }: FurnitureProps) {
  return (
    <div
      className={`furniture furniture--${scene}${twin ? " furniture--twin" : ""}${className ? ` ${className}` : ""}`}
      data-furniture={scene}
      data-skin={twin ?? skin}
      data-accent="lime"
      aria-hidden={twin ? true : undefined}
      inert={twin ? true : undefined}
    >
      {children}
    </div>
  );
}

/** The static layout's own poster for a beat (hidden while pinned: the stage has it). */
export function Slot({ beat, className }: { readonly beat: string; readonly className?: string }) {
  const spec = BEATS.find((b) => b.id === beat);
  return (
    <div className={`slot${className ? ` ${className}` : ""}`} aria-hidden="true">
      {spec?.fit === "circle" ? <FacePoster id={`slot-${beat}`} prefix={`slot-${beat}`} still /> : <DrawingPoster id={beat} />}
    </div>
  );
}
