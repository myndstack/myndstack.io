import { ImageResponse } from "next/og";
import { OG_CONTENT_TYPE, OG_SIZE, OgCard } from "@/components/OgCard";

export const alt = "Myndstack — Founder-led AI & software engineering studio";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpengraphImage() {
  return new ImageResponse(
    OgCard({
      eyebrow: "Founder-led studio · AI + software",
      title: "Architected and built,",
      accent: "end to end.",
    }),
    size,
  );
}
