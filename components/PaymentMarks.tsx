/* eslint-disable @next/next/no-img-element -- same call as Wordmark: tiny
   static SVGs, so the optimizer has nothing to do and next/image would only add
   a runtime wrapper (and want `dangerouslyAllowSVG` turned on globally). */

import type { RegionCode } from "@/lib/content";

/**
 * Accepted-payment marks for the checkout panel.
 *
 * Every entry is a REAL official mark, vendored as a colour card tile in
 * `public/payment/` (source + licence noted inside each file) and served as
 * <img> — out of the client bundle, cached by the browser, and swappable
 * without touching this component. Showing the marks of the methods you take is
 * nominative use. UPI and Apple Pay are the same renditions Razorpay uses inside
 * Checkout, so the mark here is pixel-identical to the one the buyer meets in
 * the modal a click later — the strongest version of "this will work".
 *
 * Marks only, no typeset labels. Netbanking was a chip here and looked exactly
 * like what it was: a placeholder among four logos. It is a *category*, not a
 * brand — there is no netbanking mark to vendor, because real Indian checkouts
 * list individual bank logos or say the word in prose. This page already says it
 * in prose, in the tier's own "Secure checkout" step. If a method has no mark,
 * it does not belong in a row of marks.
 *
 * This row is a promise about what will work on the next screen, not
 * decoration. Every mark must correspond to a method actually enabled on the
 * Razorpay account — if Apple Pay is ever switched off there, delete it here in
 * the same change.
 */

type Mark = { readonly src: string; readonly label: string };

const VISA: Mark = { src: "/payment/visa.svg", label: "Visa" };
const MASTERCARD: Mark = { src: "/payment/mastercard.svg", label: "Mastercard" };
const AMEX: Mark = { src: "/payment/amex.svg", label: "American Express" };
const UPI: Mark = { src: "/payment/upi.svg", label: "UPI" };
const APPLE_PAY: Mark = { src: "/payment/apple-pay.svg", label: "Apple Pay" };

const INTL: readonly Mark[] = [VISA, MASTERCARD, AMEX, APPLE_PAY];
const DOMESTIC: readonly Mark[] = [VISA, MASTERCARD, UPI, APPLE_PAY];

/** The accepted-method row for the visitor's region. */
export default function PaymentMarks({ region }: { region: RegionCode }) {
  const marks = region === "IN" ? DOMESTIC : INTL;
  return (
    <ul
      aria-label="Accepted payment methods"
      // Centred while the panel is full-page-width (below xs), so a row that
      // wraps stays balanced instead of leaving a ragged last line.
      className="m-0 flex list-none flex-wrap items-center justify-center gap-1.5 p-0 xs:justify-start"
    >
      {marks.map((mark) => (
        <li key={mark.label} className="flex">
          {/* Intrinsic size given so the row never reflows when the tiles land.
              37×24 is the 780×500 ratio; `.pay-mark` pins the height. */}
          <img
            src={mark.src}
            alt={mark.label}
            width={37}
            height={24}
            className="pay-mark"
          />
        </li>
      ))}
    </ul>
  );
}
