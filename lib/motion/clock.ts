/**
 * The HUD's studio clock: Malappuram time (IST, UTC+5:30, no DST). Computed by
 * offset rather than Intl so it's identical on every runtime and in tests.
 */

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

const pad = (n: number): string => String(n).padStart(2, "0");

export function formatIst(epochMs: number): string {
  const inDay = (((epochMs + IST_OFFSET_MS) % DAY) + DAY) % DAY;
  const minutes = Math.floor(inDay / MINUTE);
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** Delay until the next minute boundary (a full minute if exactly on one). */
export function msToNextMinute(epochMs: number): number {
  const into = ((epochMs % MINUTE) + MINUTE) % MINUTE;
  return MINUTE - into;
}
