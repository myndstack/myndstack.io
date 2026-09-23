import type { CSSProperties } from "react";

/** Strings in the discipline's hue, keywords bright, everything else muted. */
const TOKEN = /('[^']*'|"[^"]*"|\b(?:export|const|return|from|import|pipeline)\b)/g;

type Props = {
  readonly file: string;
  readonly lines: readonly string[];
  readonly index: number;
  readonly total: number;
  readonly hue: string;
  readonly className?: string;
  /** The stage copy is shown by the run's timeline (`data-panel`). */
  readonly panel?: boolean;
};

/**
 * A small editor-style card showing how a build in this discipline is shaped.
 * Illustrative, decorative code: aria-hidden (the article beside it carries
 * the meaning), no copy button.
 */
export default function SpecPanel({ file, lines, index, total, hue, className, panel }: Props) {
  return (
    <div
      className={`spec-panel${className ? ` ${className}` : ""}`}
      data-panel={panel ? index : undefined}
      style={{ "--hue": hue } as CSSProperties}
      aria-hidden="true"
    >
      <div className="spec-head">
        <span className="spec-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="spec-file">{file}</span>
        <span className="spec-n">
          {String(index + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}
        </span>
      </div>
      <pre className="spec-code">
        {lines.map((line, i) => (
          <span key={i} className="spec-line">
            <span className="spec-ln">{i + 1}</span>
            {line.split(TOKEN).map((part, j) =>
              j % 2 === 1 ? (
                <span key={j} className={part.startsWith("'") || part.startsWith('"') ? "tok-str" : "tok-kw"}>
                  {part}
                </span>
              ) : (
                part
              ),
            )}
            {"\n"}
          </span>
        ))}
      </pre>
    </div>
  );
}
