/**
 * Splits "99.99%" into prefix / numeric core / suffix, so "3 regions", "12ms"
 * and "120+" all animate on just their number.
 */
const NUMERIC = /^([^\d-]*)(-?[\d,]*\.?\d+)(.*)$/;

export type Metric = {
  prefix: string;
  suffix: string;
  target: number;
  decimals: number;
  /** Whether the source used thousands separators, so output matches. */
  grouped: boolean;
};

/** Returns null for values with no animatable number, e.g. "Custom". */
export function parseMetric(value: string): Metric | null {
  const match = value.match(NUMERIC);
  if (!match) return null;

  const [, prefix, raw, suffix] = match;
  const target = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(target)) return null;

  return {
    prefix,
    suffix,
    target,
    decimals: raw.includes(".") ? raw.split(".")[1].length : 0,
    grouped: raw.includes(","),
  };
}

/** Renders an in-progress count so it matches the final value's formatting. */
export function formatMetric(n: number, { prefix, suffix, decimals, grouped }: Metric) {
  const fixed = n.toFixed(decimals);
  const body = grouped
    ? Number(fixed).toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : fixed;
  return `${prefix}${body}${suffix}`;
}

/**
 * JSON for a <script type="application/ld+json"> block.
 *
 * `JSON.stringify` happily emits `</script>`, which would close the tag early
 * and turn the rest of the payload into markup. Content lives in editable files
 * (lib/roles.ts, lib/legal.ts), so escape rather than trust.
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

const NUMBER_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six",
  "seven", "eight", "nine", "ten", "eleven", "twelve",
];

/**
 * Spells a small count as a word ("Four ways in.") so headings read naturally,
 * falling back to digits past twelve. Exists because the careers copy used to
 * hardcode "Four" and "three" against a fixed role list — the whole reason that
 * content moved to a CMS was so the count could change, and the copy has to
 * follow it. `capitalize` for sentence-initial use.
 */
export function numberWord(n: number, capitalize = false): string {
  const word = NUMBER_WORDS[n] ?? String(n);
  return capitalize ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

/**
 * Collapses a value to a single line. Email headers are line-delimited, so
 * anything interpolated into a subject or Reply-To gets stripped of control
 * characters before it goes near the transport.
 */
export function singleLine(value: string, maxLength = 200): string {
  return (
    value
      // C0 controls plus DEL. CR/LF are the header-splitting risk; the rest are
      // stripped so a subject line can never carry hidden formatting.
      .replace(/[\u0000-\u001F\u007F]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength)
  );
}
