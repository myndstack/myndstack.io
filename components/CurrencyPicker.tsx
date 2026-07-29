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
export default function CurrencyPicker({ region, onChange }: Props) {
  const handleChange = (next: string) => {
    if (!isRegionCode(next)) return;
    writeCookie(COOKIE_REGION, next, COOKIE_MAX_AGE_SECONDS);
    writeCookie(COOKIE_SOURCE, "user", COOKIE_MAX_AGE_SECONDS);
    onChange(next);
  };

  // `region` comes from the parent, which renders the SSR default on first
  // paint and updates after /api/pricing resolves — so the select value matches
  // between server and client and there's no hydration mismatch.
  return (
    <div className="flex items-center gap-2.5 print:hidden">
      <label htmlFor="currency-picker" className="eyebrow text-t5">
        Currency
      </label>
      {/* Reuses the .ms-field select primitive (border/focus/lime chevron) so
          it matches the contact-form selects; w-auto + compact padding fit it
          into the section header rather than a full-width form row. */}
      <select
        id="currency-picker"
        value={region}
        onChange={(e) => handleChange(e.target.value)}
        className="ms-field w-auto py-2.5 text-caption"
      >
        {REGION_CODES.map((code) => (
          <option key={code} value={code}>
            {REGION_META[code].symbol} {REGION_META[code].currency}
          </option>
        ))}
      </select>
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
