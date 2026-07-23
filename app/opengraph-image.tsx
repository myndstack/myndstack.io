import { ImageResponse } from "next/og";
import { OG_CONTENT_TYPE, OG_SIZE, OgCard } from "@/components/OgCard";

export const alt = "Myndstack — Enterprise AI & Cognitive Infrastructure";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpengraphImage() {
  return new ImageResponse(
    OgCard({
      eyebrow: "Enterprise AI · Cognitive infrastructure",
      title: "Intelligence that runs",
      accent: "on infrastructure.",
    }),
    size,
  );
}
