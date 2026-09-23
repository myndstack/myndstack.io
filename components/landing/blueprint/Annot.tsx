import type { ReactNode } from "react";

/**
 * A blueprint annotation (FIG label, dimension, coordinate). Decorative by
 * default — hidden from assistive tech so screen readers aren't read a drawing
 * legend; pass `meaningful` when the text carries real information.
 */
export default function Annot({
  children,
  meaningful = false,
  className = "",
  scramble = false,
}: {
  readonly children: ReactNode;
  readonly meaningful?: boolean;
  readonly className?: string;
  /** Let the chapter's motion scramble this label in. */
  readonly scramble?: boolean;
}) {
  return (
    <span className={`annot relative block ${className}`} aria-hidden={meaningful ? undefined : true}>
      <span data-scramble-text={scramble ? "" : undefined}>{children}</span>
      {/* Empty overlay the chapter's motion fills and scrambles — React never
          renders into it, so mutating it can't fight reconciliation. */}
      {scramble ? <span data-scramble className="absolute inset-0" aria-hidden="true" /> : null}
    </span>
  );
}
