/**
 * Titles are split into words on the server, so a reveal only ever
 * transforms spans that were already laid out — the text never reflows when
 * motion starts (JS changes no layout), and without JS it's plain text.
 *
 * Splits at breaking whitespace only: a non-breaking space stays inside its
 * word, so the split title breaks lines exactly where the plain one would.
 * Exact round-trip: joining the tokens gives back the input.
 */

export type Token = { readonly text: string; readonly space: boolean };

/** Breaking whitespace (everything \s matches except U+00A0 and U+202F). */
const SPACE = /[^\S  ]+/g;

export function splitWords(text: string): readonly Token[] {
  const out: Token[] = [];
  let last = 0;
  for (const match of text.matchAll(SPACE)) {
    const at = match.index ?? 0;
    if (at > last) out.push({ text: text.slice(last, at), space: false });
    out.push({ text: match[0], space: true });
    last = at + match[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), space: false });
  return out;
}
