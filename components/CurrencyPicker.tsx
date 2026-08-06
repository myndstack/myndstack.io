"use client";

import type { RegionCode } from "@/lib/content";
import {
  COOKIE_MAX_AGE_SECONDS,
  COOKIE_REGION,
  COOKIE_SOURCE,
  DEFAULT_REGION,
  REGION_CODES,
  REGION_META,
  isRegionCode,
} from "@/lib/region";

type Props = {
  /**
   * Region shown as active. Owner: parent <Pricing>. The picker reflects it in
   * the visible <select> value; the parent is responsible for updating this
   * after cookie writes so the two stay in sync.
   */
  region: RegionCode;
  /**
   * Fires when the user picks a currency. Passed the new RegionCode. The
   * picker has already written the cookies by the time this fires — the
   * parent's job is to refetch /api/pricing.
   *
   * (The `null` slot in the type is retained for API compatibility with the
   * old "Auto" pill; today no path in the picker calls it with null.)
   */
  onChange: (region: RegionCode | null) => void;
  /**
   * Drops the visible "Currency" label, keeping it as the select's accessible
   * name. For the checkout panel, where the control shares a 350px row with the
   * section eyebrow and the label is redundant anyway — the select already
   * reads "£ GBP". The Pricing section keeps the label, since there the control
   * sits alone in open space with nothing else to identify it.
   */
  compact?: boolean;
};

/**
 * Native <select> currency chooser, sat top-right of the Pricing section.
 *
 * Why a native select instead of a custom widget:
 *   - Free keyboard navigation, screen reader announcement, and — importantly —
 *     the mobile OS renders it as a wheel or bottom sheet the user already
 *     knows how to use.
 *   - No focus-trap or Escape handling to maintain.
 *
 * There is no "Auto" option in the visible list. Auto is the *initial* state:
 * before any user pick, the region comes from the middleware/geo cookie. Once
 * the user picks anything from the dropdown, that pick persists (pref_source
 * = user). This matches how Vercel and Stripe do it — clearing site data
 * "resets to auto".
 */
export default function CurrencyPicker({ region, onChange, compact }: Props) {
  // The select simply reflects the parent's `region`. Hydration is safe with no
  // local state: the parent seeds `region` with the same default the server
  // rendered, and only moves it after its own post-mount /api/pricing fetch.
  const handleChange = (next: string) => {
    if (!isRegionCode(next)) return;
    writeCookie(COOKIE_REGION, next, COOKIE_MAX_AGE_SECONDS);
    writeCookie(COOKIE_SOURCE, "user", COOKIE_MAX_AGE_SECONDS);
    onChange(next);
  };

  return (
    <div className="flex items-center gap-2.5 print:hidden">
      {compact ? null : (
        <label
          htmlFor="currency-picker"
          className="font-mono text-[11px] tracking-[0.14em] text-t5 uppercase"
        >
          Currency
        </label>
      )}
      <div className="relative">
        <select
          id="currency-picker"
          value={region}
          // Compact drops the <label>, so the name has to come from here —
          // a select whose only name is its current value announces as "GBP",
          // which says what it is but not what it does.
          aria-label={compact ? "Currency" : undefined}
          onChange={(e) => handleChange(e.target.value)}
          className="ease-brand cursor-pointer appearance-none border border-line-3 bg-surface py-2 pr-8 pl-3 font-mono text-[12px] tracking-[0.04em] text-t2 uppercase transition-colors duration-160 hover:border-lime-edge focus:border-lime focus:outline-none"
        >
          {REGION_CODES.map((code) => (
            <option key={code} value={code}>
              {REGION_META[code].symbol} {REGION_META[code].currency}
            </option>
          ))}
        </select>
        {/* Custom chevron since we suppressed the native one with appearance-none. */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-2.5 size-3 -translate-y-1/2 text-t5"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </div>
    </div>
  );
}

// --- cookie helpers ---------------------------------------------------------
// Local because CurrencyPicker is the only client-side cookie writer; server
// side reads via next/headers.

function writeCookie(name: string, value: string, maxAge: number) {
  if (typeof document === "undefined") return;
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "path=/",
    "samesite=lax",
    `max-age=${maxAge}`,
  ];
  if (location.protocol === "https:") parts.push("secure");
  document.cookie = parts.join("; ");
}

export { DEFAULT_REGION, isRegionCode };
