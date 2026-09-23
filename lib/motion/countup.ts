/**
 * The displayed value of a metric string at progress `p` (0..1): the first
 * number inside it counts up from zero, and everything around it — "~", "%",
 * "x", "ms", "₹" — stays put. At p = 1 the original string comes back verbatim,
 * so the settled number is always exactly what the CMS says.
 */

const NUMBER = /\d[\d,]*(?:\.\d+)?/;

export function countUp(value: string, p: number): string {
  if (p >= 1) return value;
  const match = NUMBER.exec(value);
  if (!match) return value;

  const raw = match[0];
  const grouped = raw.includes(",");
  const decimals = raw.includes(".") ? raw.split(".")[1].length : 0;
  const target = Number(raw.replace(/,/g, ""));
  const current = target * Math.max(0, p);

  let formatted = current.toFixed(decimals);
  if (grouped) {
    // Same grouping as the source: Indian (1,00,000) when its last group but
    // one is two digits, otherwise Western (12,000).
    const groups = raw.split(".")[0].split(",");
    const indian = groups.length > 2 && groups[groups.length - 2].length === 2;
    formatted = Number(formatted).toLocaleString(indian ? "en-IN" : "en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  return value.slice(0, match.index) + formatted + value.slice(match.index + raw.length);
}
