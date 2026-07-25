import type { ReactNode } from "react";
import SectionField from "./SectionField";

/**
 * Wraps a section in the animated blueprint field (see SectionField).
 *
 * `overflow-hidden` clips the drifting glows so they can't widen the document or
 * bleed into neighbouring sections; `isolate` + DOM order keep the field (z-0)
 * behind the section's content. This is the exact arrangement the after-hero
 * band was built with — packaged so any open section can opt in.
 */
export default function FieldBand({
  children,
  signals = false,
  variant = 1,
}: {
  children: ReactNode;
  /** Run the travelling-signal canvas (focal bands only). */
  signals?: boolean;
  /** Glow layout, so adjacent/repeated bands don't look identical. */
  variant?: 1 | 2 | 3;
}) {
  return (
    <div className="relative isolate overflow-hidden">
      <SectionField signals={signals} variant={variant} />
      {children}
    </div>
  );
}
