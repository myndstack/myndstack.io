/**
 * A seekable text "decode": at progress p the first ~p of the characters show
 * their real glyph, the rest a pseudo-random one. Deterministic in (text, p,
 * seed), so a paused timeline can seek it to any frame. Only ever written into
 * an aria-hidden overlay — the real text is always in the DOM underneath.
 */

/** Glyph pools by the original character's class, so a scrambled line keeps
 *  roughly the real line's width (and so its wrapping) while it decodes. */
const LOWER = "abcdeghknopqrsuvxyz";
const UPPER = "ABCDEGHKNOPQRSUVXYZ";
const OTHER = "0123456789#*+=<>";

/** Characters that are never scrambled (they'd change the line's rhythm). */
const KEEP = /[\s.,·—–\-→/]/;

const pool = (ch: string): string =>
  ch >= "a" && ch <= "z" ? LOWER : ch >= "A" && ch <= "Z" ? UPPER : OTHER;

export function scrambleFrame(text: string, progress: number, seed: number): string {
  if (progress >= 1) return text;
  const chars = Array.from(text);
  const n = chars.length;
  // A soft front: characters resolve over a band rather than one at a time.
  const front = progress * (n + 4) - 2;
  const step = Math.floor(progress * 24);
  return chars
    .map((ch, i) => {
      if (KEEP.test(ch) || i < front) return ch;
      const h = Math.imul(i + 1, 2654435761) ^ Math.imul(seed + step + 1, 40503);
      const glyphs = pool(ch);
      return glyphs[(h >>> 0) % glyphs.length];
    })
    .join("");
}
