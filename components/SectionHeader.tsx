import type { ReactNode } from "react";
import Reveal from "./Reveal";

type Props = {
  eyebrow: string;
  title: ReactNode;
  /** Right-hand supporting copy — renders in a split row when present. */
  aside?: ReactNode;
  /** Copy directly under the heading, in the same column. */
  lede?: ReactNode;
  align?: "start" | "center";
  className?: string;
  titleMaxWidth?: string;
};

/** Eyebrow + H2 (+ optional aside/lede) — the header pattern every section shares. */
export default function SectionHeader({
  eyebrow,
  title,
  aside,
  lede,
  align = "start",
  className = "",
  titleMaxWidth = "560px",
}: Props) {
  const centered = align === "center";

  return (
    <Reveal
      className={
        aside
          ? `flex flex-wrap items-end justify-between gap-10 ${className}`
          : `${centered ? "mx-auto text-center" : ""} ${className}`
      }
      style={centered && !aside ? { maxWidth: "620px" } : undefined}
    >
      <div style={aside ? { maxWidth: titleMaxWidth } : undefined}>
        <div className="eyebrow mb-3.5">{eyebrow}</div>
        <h2 className="h2-section">{title}</h2>
        {lede ? (
          <p className="mt-3.5 mb-0 text-base leading-[1.55] text-t4">{lede}</p>
        ) : null}
      </div>
      {aside ? (
        <p className="m-0 max-w-[320px] text-[15px] leading-[1.55] text-t4">{aside}</p>
      ) : null}
    </Reveal>
  );
}
