import type { ReactElement } from "react";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

/**
 * Shared social-card layout for every `opengraph-image` route.
 *
 * Set in system sans rather than the brand faces: next/og needs the raw font
 * bytes bundled to use a webfont, and the card is flat-weight anyway. The 45°
 * lime corner is faked with a border triangle since next/og has no clip-path.
 */
export function OgCard({
  eyebrow,
  title,
  accent,
  footer = "myndstack.io",
}: {
  eyebrow: string;
  /** Rendered on its own line, in white. */
  title: string;
  /** Optional second line, rendered in lime. */
  accent?: string;
  footer?: string;
}): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#0A0A0B",
        color: "#fff",
        padding: "72px 80px",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 0,
          height: 0,
          borderTop: "120px solid #C9F24D",
          borderLeft: "120px solid transparent",
        }}
      />

      <div
        style={{
          display: "flex",
          fontSize: 22,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#C9F24D",
          fontWeight: 700,
        }}
      >
        {eyebrow}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: title.length > 34 ? 62 : 82,
          lineHeight: 1.02,
          letterSpacing: "-0.03em",
          fontWeight: 700,
        }}
      >
        <span>{title}</span>
        {accent ? <span style={{ color: "#C9F24D" }}>{accent}</span> : null}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          borderTop: "1px solid #1F1F23",
          paddingTop: 28,
          fontSize: 24,
          color: "#9A9AA2",
        }}
      >
        <span style={{ color: "#fff", fontWeight: 700, letterSpacing: "0.04em" }}>
          MYNDSTACK
        </span>
        <span>{footer}</span>
      </div>
    </div>
  );
}
