import type { CSSProperties, ReactNode } from "react";

import { splitWords } from "@/lib/landing/split";

/**
 * The landing's type kit — the only way copy is set on /preview, so sizes,
 * rhythm and reveals can't drift: a kicker ([§nn] stamp + label, in the
 * accent), a display title (split into words on the server, so a reveal only
 * ever moves spans that were already laid out), and a lede.
 */

export type TitleLine = string | { readonly text: string; readonly tone?: "setup" };

type TitleProps = {
  readonly as?: "h1" | "h2" | "h3" | "p";
  readonly size?: "xl" | "l";
  readonly lines: readonly TitleLine[];
  readonly id?: string;
  readonly className?: string;
};

export function Title({ as: Tag = "h2", size = "l", lines, id, className }: TitleProps) {
  let word = 0;
  const out: ReactNode[] = [];
  lines.forEach((line, k) => {
    const { text, tone } = typeof line === "string" ? { text: line, tone: undefined } : line;
    out.push(
      <span key={k} className={tone === "setup" ? "tone-setup" : undefined}>
        {splitWords(text).map((t, j) =>
          t.space ? (
            t.text
          ) : (
            <span key={j} className="w">
              <span className="wi" style={{ "--wi": word++ } as CSSProperties}>
                {t.text}
              </span>
            </span>
          ),
        )}
      </span>,
    );
    if (k < lines.length - 1) out.push(<br key={`br-${k}`} />);
  });
  return (
    <Tag id={id} className={`t-display-${size}${className ? ` ${className}` : ""}`}>
      {out}
    </Tag>
  );
}

export function Kicker({ n, children }: { readonly n?: string; readonly children: ReactNode }) {
  return (
    <p className="kicker">
      {n ? <span className="stamp">{n}</span> : null}
      <span>{children}</span>
    </p>
  );
}

/** A rising block (lede, list, CTA row): `i` staggers it 50ms behind the one before. */
export function Rise({
  as: Tag = "div",
  i = 0,
  className,
  children,
}: {
  readonly as?: "div" | "p" | "ul" | "ol" | "dl";
  readonly i?: number;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return (
    <Tag className={className} data-rise style={{ "--ri": i } as CSSProperties}>
      {children}
    </Tag>
  );
}

export function Lede({ i = 0, children }: { readonly i?: number; readonly children: ReactNode }) {
  return (
    <Rise as="p" i={i} className="t-lede">
      {children}
    </Rise>
  );
}
