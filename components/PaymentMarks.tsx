import type { CSSProperties, ReactNode } from "react";
import type { RegionCode } from "@/lib/content";

/**
 * Accepted-payment marks for the checkout panel.
 *
 * These are clean MONOCHROME renditions (currentColor) crafted to sit on the
 * dark panel — a wordmark for the card networks, the interlocking circles for
 * Mastercard, and glyph+word for the wallets — NOT the full-colour official
 * brand assets. Showing accepted-method marks is nominative use, and the real
 * official logos also appear inside the Razorpay modal on Pay. For pixel-perfect
 * or strictly brand-compliant marks (Apple Pay and Google Pay have guidelines),
 * drop official SVGs into public/payment/ and render <img> here instead.
 */

const svgCls = "h-[15px] w-auto flex-none";
const wordmark = (
  weight: number,
  size: number,
  extra?: CSSProperties,
): CSSProperties => ({
  fontFamily: "var(--font-display)",
  fontWeight: weight,
  fontSize: `${size}px`,
  letterSpacing: "-0.5px",
  ...extra,
});

const Visa = (
  <svg viewBox="0 0 48 16" className={svgCls} role="img" aria-label="Visa">
    <text x="0" y="13.5" fill="currentColor" style={wordmark(800, 16, { fontStyle: "italic", letterSpacing: "-1.2px" })}>
      VISA
    </text>
  </svg>
);

const Mastercard = (
  <svg viewBox="0 0 30 20" className={svgCls} role="img" aria-label="Mastercard">
    <circle cx="11.5" cy="10" r="8" fill="currentColor" fillOpacity="0.85" />
    <circle cx="18.5" cy="10" r="8" fill="currentColor" fillOpacity="0.45" />
  </svg>
);

const Amex = (
  <svg viewBox="0 0 44 18" className={svgCls} role="img" aria-label="American Express">
    <rect x="0.6" y="0.6" width="42.8" height="16.8" rx="2.4" fill="none" stroke="currentColor" strokeOpacity="0.55" />
    <text x="22" y="12.4" textAnchor="middle" fill="currentColor" style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "8.5px", letterSpacing: "0.6px" }}>
      AMEX
    </text>
  </svg>
);

const RuPay = (
  <svg viewBox="0 0 52 16" className={svgCls} role="img" aria-label="RuPay">
    <text x="0" y="13" fill="currentColor" style={wordmark(700, 14)}>
      RuPay
    </text>
  </svg>
);

const Upi = (
  <svg viewBox="0 0 34 16" className={svgCls} role="img" aria-label="UPI">
    <text x="0" y="13" fill="currentColor" style={wordmark(700, 14)}>
      UPI
    </text>
  </svg>
);

const ApplePay = (
  <svg viewBox="0 0 40 18" className={svgCls} role="img" aria-label="Apple Pay">
    <path
      d="M7.6 4.3c.5-.6.8-1.4.7-2.3-.7 0-1.6.5-2.1 1.1-.5.5-.9 1.4-.7 2.2.8.1 1.6-.4 2.1-1zM8.3 5.5c-1.2-.1-2.2.7-2.8.7-.6 0-1.4-.7-2.3-.6-1.2 0-2.3.7-2.9 1.8-1.2 2.1-.3 5.3.9 7 .6.9 1.3 1.8 2.2 1.7.9 0 1.2-.6 2.3-.6s1.4.6 2.3.6c.9 0 1.6-.9 2.2-1.7.4-.6.6-1 .8-1.6-2-.8-2.3-3.6-.3-4.7-.6-.8-1.5-1.4-2.4-1.4z"
      fill="currentColor"
    />
    <text x="16.5" y="13.5" fill="currentColor" style={wordmark(600, 12.5)}>
      Pay
    </text>
  </svg>
);

const GooglePay = (
  <svg viewBox="0 0 42 18" className={svgCls} role="img" aria-label="Google Pay">
    <text x="0" y="13.5" fill="currentColor" style={wordmark(700, 13.5)}>
      G
    </text>
    <text x="10.5" y="13.5" fill="currentColor" style={wordmark(600, 12.5)}>
      Pay
    </text>
  </svg>
);

const INTL: ReactNode[] = [Visa, Mastercard, Amex, ApplePay, GooglePay];
const DOMESTIC: ReactNode[] = [Visa, Mastercard, RuPay, Upi, ApplePay];

/** A row of accepted-payment marks for the visitor's region. */
export default function PaymentMarks({ region }: { region: RegionCode }) {
  const marks = region === "IN" ? DOMESTIC : INTL;
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 text-t4" aria-label="Accepted payment methods">
      {marks.map((mark, i) => (
        <span key={i} className="inline-flex items-center">
          {mark}
        </span>
      ))}
    </div>
  );
}
