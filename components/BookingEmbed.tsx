"use client";

import CalInline, { CAL_LINK } from "./CalInline";

/**
 * Cal.com inline booking, for people who'd rather talk than fill in a form.
 *
 * Renders nothing — and loads no third-party script — unless NEXT_PUBLIC_CAL_LINK
 * is set, so the default build ships with no external JS at all.
 */
export default function BookingEmbed() {
  if (!CAL_LINK) return null;

  return (
    <div className="mt-9 border-t border-line pt-8">
      <div className="label-mono mb-2">Prefer to talk?</div>
      <p className="mt-0 mb-5 max-w-[400px] text-15 leading-body text-t4">
        Book 30 minutes with an engineer — not a salesperson.
      </p>

      <CalInline />
    </div>
  );
}
