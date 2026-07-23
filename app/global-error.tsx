"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary: catches failures in the root layout itself, so it has to
 * render its own <html> and <body>. Styles are inline because a layout failure
 * may mean the stylesheet never applied.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: 20,
          padding: "40px 24px",
          background: "#0A0A0B",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#C9F24D",
          }}
        >
          Error
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(30px, 7vw, 56px)",
            lineHeight: 1.02,
            letterSpacing: "-0.03em",
            maxWidth: 620,
          }}
        >
          Something in the stack gave way.
        </h1>
        <p style={{ margin: 0, maxWidth: 460, lineHeight: 1.55, color: "#9A9AA2" }}>
          This one is on us. Reload and try again.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 12,
            padding: "15px 26px",
            border: "none",
            background: "#C9F24D",
            color: "#18230A",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
