import type { MetadataRoute } from "next";

/**
 * Installability metadata.
 *
 * The SVG serves the "any"-purpose icon at every size; the two PNGs are maskable,
 * with the mark padded into Android's centre-80% safe zone. Both are generated
 * from the same square mark at build time — see app/icons/[icon]/route.ts.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Myndstack — Founder-led AI & software engineering studio",
    short_name: "Myndstack",
    description:
      "A founder-led studio that architects and builds the whole stack — AI systems, the web and mobile products around them, and the cloud underneath.",
    start_url: "/",
    display: "standalone",
    background_color: "#0A0A0B",
    theme_color: "#0A0A0B",
    icons: [
      {
        src: "/myndstack-logo-square.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
