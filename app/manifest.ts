import type { MetadataRoute } from "next";

/**
 * Installability metadata.
 *
 * Icons are the existing square SVG only. Android's install prompt wants
 * maskable 192px and 512px PNGs, which would mean fabricating a logo asset — the
 * README lists generating them from the real mark as a launch task.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Myndstack — Enterprise AI & Cognitive Infrastructure",
    short_name: "Myndstack",
    description:
      "Mission-critical systems, SaaS platforms, digital transformation, and technology consulting at scale — one engineered stack from data plane to model.",
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
    ],
  };
}
