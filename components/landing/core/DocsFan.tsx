import type { CSSProperties } from "react";

const SHEETS = 5;
/** Redaction bar widths (%) per sheet row — the anonymised proof, literally. */
const REDACTIONS = [
  [62, 38, 80],
  [44, 70, 30],
  [76, 52, 40],
  [34, 64, 58],
  [70, 46, 66],
] as const;

/**
 * The work's figure: a stack of controlled documents — redacted, as the proof
 * is — fanned out, each stamped PASS, with a scan line passing over them.
 * Decorative (the case copy carries the meaning). Server-rendered built; the
 * stage's overlay (or the chapter, in the static layout) plays it in.
 */
export default function DocsFan({ className }: { readonly className?: string }) {
  return (
    <div className={`docs${className ? ` ${className}` : ""}`} aria-hidden="true">
      <div className="docs-plane">
        {Array.from({ length: SHEETS }, (_, k) => (
          <div key={k} className="doc" data-doc={k} style={{ "--i": k } as CSSProperties}>
            <div className="doc-head">
              <span>DOC-{String(k + 1).padStart(3, "0")}</span>
              <span>CONTROLLED · REV {k + 1}</span>
            </div>
            <div className="doc-rows">
              {REDACTIONS[k].map((w, r) => (
                <span key={r} className="doc-redact" style={{ width: `${w}%` }} />
              ))}
            </div>
            <div className="doc-table">
              {Array.from({ length: 12 }, (_, c) => (
                <i key={c} />
              ))}
            </div>
            <span className="doc-stamp">PASS</span>
          </div>
        ))}
        <span className="doc-scan" />
      </div>
    </div>
  );
}
