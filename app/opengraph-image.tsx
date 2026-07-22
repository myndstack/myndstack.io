import { ImageResponse } from "next/og";

export const alt = "Myndstack — Enterprise AI & Cognitive Infrastructure";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Social card. Rendered with system sans rather than the brand faces — next/og
 * would need the .ttf bytes bundled, and the card is set in flat weights anyway.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
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
          // The signature 45° corner cut, faked with a lime wedge.
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
          Enterprise AI · Cognitive infrastructure
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 82,
            lineHeight: 1.02,
            letterSpacing: "-0.03em",
            fontWeight: 700,
          }}
        >
          <span>Intelligence that runs</span>
          <span style={{ color: "#C9F24D" }}>on infrastructure.</span>
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
          <span>myndstack.io</span>
        </div>
      </div>
    ),
    size,
  );
}
