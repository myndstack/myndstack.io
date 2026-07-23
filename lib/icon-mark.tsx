import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/** Brand ink — matches the manifest's background_color / theme_color. */
const BG = "#0A0A0B";

/**
 * The square logo with its opaque black backing rect stripped, so only the white
 * wordmark remains. That lets the mark sit on the brand-ink field at any scale
 * with no visible inner-square seam.
 *
 * Single source of truth: public/myndstack-logo-square.svg — the same asset the
 * favicon and BIMI use. Read once at module load and inlined as a data URI so
 * next/og (Satori + resvg) can rasterise it.
 */
const markDataUri = (() => {
  const svg = readFileSync(
    join(process.cwd(), "public", "myndstack-logo-square.svg"),
    "utf8",
  ).replace(/<rect[^>]*\/?>(?:<\/rect>)?/, "");
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
})();

/**
 * A square icon: the mark centred on the brand-ink field.
 *
 * `scale` is the mark's share of the canvas — near 1 for the Apple touch icon
 * (iOS applies its own rounded mask), smaller for maskable icons so the wordmark
 * stays inside Android's centre-80% safe zone.
 */
export function iconResponse(size: number, scale: number): ImageResponse {
  const mark = Math.round(size * scale);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BG,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={markDataUri} width={mark} height={mark} alt="" />
      </div>
    ),
    { width: size, height: size },
  );
}
