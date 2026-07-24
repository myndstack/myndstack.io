import { ImageResponse } from "next/og";
import { OG_CONTENT_TYPE, OG_SIZE, OgCard } from "@/components/OgCard";
import { getCase, getCaseSlugs } from "@/lib/sanity/queries";

export const alt = "Myndstack case study";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export async function generateStaticParams() {
  return (await getCaseSlugs()).map((slug) => ({ slug }));
}

export default async function CaseOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const study = await getCase((await params).slug);

  return new ImageResponse(
    OgCard({
      eyebrow: study ? `Case study · ${study.industry}` : "Case study",
      title: study?.client ?? "Selected work",
      accent: study?.metrics.find((m) => m.lime)?.v,
    }),
    size,
  );
}
